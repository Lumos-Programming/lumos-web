import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import {
  FieldPath,
  getFirestore,
  Timestamp as FirestoreTimestamp,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type Transaction,
} from "firebase-admin/firestore";
import {
  compareDocumentIds,
  splitPath,
  type CommitRequest,
  type DatabaseBackend,
  type DocumentData,
  type DocumentImage,
  type OutboxEvent,
  type StoredDocument,
} from "./types";
import { decodeOutboxDocuments, encodeOutboxDocuments } from "./outbox";
import { Timestamp } from "./values";

const VERSIONS_COLLECTION = "_migration_versions";
const OUTBOX_COLLECTION = "_migration_outbox";

// Keep initialization lazy: a D1-only deployment does not need Firebase
// credentials, and importing application modules must not open connections.
export function getFirestoreDb(): Firestore {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      initializeApp({
        credential: cert({
          projectId:
            projectId ||
            (process.env.FIRESTORE_EMULATOR_HOST ? "test-project" : undefined),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else if (process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId: projectId || "test-project" });
    } else if (projectId) {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } else {
      throw new Error(
        "FIREBASE_PROJECT_ID is required when Firestore is enabled.",
      );
    }
  }
  return process.env.FIRESTORE_DATABASE_ID
    ? getFirestore(process.env.FIRESTORE_DATABASE_ID)
    : getFirestore();
}

function mapValue(value: unknown, toFirestore: boolean): unknown {
  if (value instanceof FirestoreTimestamp) {
    return toFirestore
      ? value
      : new Timestamp(value.seconds, value.nanoseconds);
  }
  if (value instanceof Timestamp) {
    return toFirestore
      ? new FirestoreTimestamp(value.seconds, value.nanoseconds)
      : value;
  }
  if (value instanceof Date) {
    return toFirestore
      ? FirestoreTimestamp.fromDate(value)
      : Timestamp.fromDate(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => mapValue(item, toFirestore));
  }
  if (
    value &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapValue(item, toFirestore),
      ]),
    );
  }
  return value;
}

function versionRef(db: Firestore, path: string) {
  splitPath(path);
  return db.collection(VERSIONS_COLLECTION).doc(encodeURIComponent(path));
}

function snapshotTime(snapshot: DocumentSnapshot): string {
  const time = snapshot.updateTime;
  return time ? `${time.seconds}:${time.nanoseconds}` : "missing";
}

function storedDocument(
  path: string,
  document: DocumentSnapshot,
  version: DocumentSnapshot,
): StoredDocument {
  const revision = version.exists
    ? version.get("revision")
    : document.exists
      ? 0
      : -1;
  if (!Number.isSafeInteger(revision) || revision < (version.exists ? 0 : -1)) {
    throw new Error(`Invalid migration revision for ${path}`);
  }
  return {
    path,
    data: document.exists
      ? (mapValue(document.data(), false) as DocumentData)
      : null,
    revision,
    token: `${snapshotTime(document)}|${snapshotTime(version)}|${revision}`,
  };
}

async function readDocuments(
  db: Firestore,
  transaction: Transaction,
  paths: string[],
): Promise<StoredDocument[]> {
  if (paths.length === 0) return [];
  const references = paths.flatMap((path) => [
    db.doc(path),
    versionRef(db, path),
  ]);
  const snapshots = await transaction.getAll(...references);
  return paths.map((path, index) =>
    storedDocument(path, snapshots[index * 2], snapshots[index * 2 + 1]),
  );
}

function writeImage(
  db: Firestore,
  transaction: Transaction,
  document: DocumentImage,
) {
  const [collection, id] = splitPath(document.path);
  if (!Number.isSafeInteger(document.revision) || document.revision < 0) {
    throw new Error(`Invalid migration revision for ${document.path}`);
  }
  const ref = db.doc(document.path);
  if (document.data === null) {
    transaction.delete(ref);
  } else {
    transaction.set(ref, mapValue(document.data, true) as DocumentData);
  }
  transaction.set(versionRef(db, document.path), {
    path: document.path,
    collection,
    id,
    revision: document.revision,
    deleted: document.data === null,
  });
}

function eventChunkRefs(snapshot: DocumentSnapshot) {
  const count: unknown = snapshot.get("chunkCount");
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1)
    throw new Error("Invalid migration outbox chunk count");
  return Array.from({ length: count }, (_, index) =>
    snapshot.ref.collection("chunks").doc(String(index)),
  );
}

export function createFirestoreBackend(): DatabaseBackend {
  return {
    name: "firestore",

    async get(path) {
      splitPath(path);
      const db = getFirestoreDb();
      return db.runTransaction(
        async (transaction) =>
          (await readDocuments(db, transaction, [path]))[0],
        { readOnly: true },
      );
    },

    async query(spec) {
      const db = getFirestoreDb();
      let query: Query = db.collection(spec.collection);
      for (const filter of spec.filters || []) {
        query = query.where(
          filter.field,
          filter.operator,
          mapValue(filter.value, true),
        );
      }
      if (spec.order) {
        query = query.orderBy(spec.order.field, spec.order.direction);
      }
      if (spec.limit !== undefined) query = query.limit(spec.limit);
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        path: doc.ref.path,
        data: mapValue(doc.data(), false) as DocumentData,
      }));
    },

    async commit(request: CommitRequest) {
      const db = getFirestoreDb();
      return db.runTransaction(async (transaction) => {
        const current = await readDocuments(
          db,
          transaction,
          request.checks.map((check) => check.path),
        );
        if (
          current.some(
            (document, index) => document.token !== request.checks[index].token,
          )
        ) {
          return false;
        }
        for (const document of request.documents) {
          writeImage(db, transaction, document);
        }
        if (request.outbox) {
          const event = request.outbox;
          const ref = db.collection(OUTBOX_COLLECTION).doc(event.id);
          const chunks = encodeOutboxDocuments(event.documents);
          transaction.create(ref, {
            target: event.target,
            createdAt: event.createdAt,
            chunkCount: chunks.length,
          });
          chunks.forEach((payload, index) => {
            transaction.create(ref.collection("chunks").doc(String(index)), {
              payload,
            });
          });
        }
        return true;
      });
    },

    async applyReplica(documents) {
      if (documents.length === 0) return;
      const newest = new Map<string, DocumentImage>();
      for (const document of documents) {
        const previous = newest.get(document.path);
        if (!previous || previous.revision < document.revision) {
          newest.set(document.path, document);
        }
      }
      const db = getFirestoreDb();
      await db.runTransaction(async (transaction) => {
        const current = await readDocuments(db, transaction, [
          ...newest.keys(),
        ]);
        for (const document of current) {
          const incoming = newest.get(document.path)!;
          if (incoming.revision > document.revision) {
            writeImage(db, transaction, incoming);
          }
        }
      });
    },

    async pendingEvents(limit) {
      const db = getFirestoreDb();
      // Read headers and chunks at one snapshot so a concurrent acknowledgement
      // cannot remove payload chunks between the two reads.
      return db.runTransaction(
        async (transaction) => {
          const snapshot = await transaction.get(
            db.collection(OUTBOX_COLLECTION).orderBy("createdAt").limit(limit),
          );
          return Promise.all(
            snapshot.docs.map(async (header): Promise<OutboxEvent> => {
              const chunks = await transaction.getAll(
                ...eventChunkRefs(header),
              );
              const payloads = chunks.map((chunk) => {
                const payload: unknown = chunk.get("payload");
                if (typeof payload !== "string")
                  throw new Error("Missing migration outbox chunk");
                return payload;
              });
              return {
                id: header.id,
                target: header.get("target"),
                createdAt: header.get("createdAt"),
                documents: decodeOutboxDocuments(payloads),
              };
            }),
          );
        },
        { readOnly: true },
      );
    },

    async acknowledgeEvent(id) {
      const db = getFirestoreDb();
      await db.runTransaction(async (transaction) => {
        const header = await transaction.get(
          db.collection(OUTBOX_COLLECTION).doc(id),
        );
        if (!header.exists) return;
        for (const ref of eventChunkRefs(header)) transaction.delete(ref);
        transaction.delete(header.ref);
      });
    },

    async scan(collection, after, limit = 100) {
      if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error("Scan limit must be a positive integer.");
      }
      const db = getFirestoreDb();
      return db.runTransaction(
        async (transaction) => {
          let liveQuery = db
            .collection(collection)
            .orderBy(FieldPath.documentId());
          if (after !== undefined) liveQuery = liveQuery.startAfter(after);
          const live = await transaction.get(liveQuery.limit(limit));
          // The path prefix uses the existing single-field index. Bound both
          // streams before merging to keep reads proportional to the page size.
          let versionQuery = db
            .collection(VERSIONS_COLLECTION)
            .orderBy("path")
            .endBefore(`${collection}0`);
          versionQuery =
            after === undefined
              ? versionQuery.startAt(`${collection}/`)
              : versionQuery.startAfter(`${collection}/${after}`);
          const versions = await transaction.get(versionQuery.limit(limit));
          const ids = new Set(live.docs.map((document) => document.id));
          for (const version of versions.docs) {
            ids.add(version.get("id") as string);
          }
          const pageIds = [...ids].sort(compareDocumentIds).slice(0, limit);
          return readDocuments(
            db,
            transaction,
            pageIds.map((id) => `${collection}/${id}`),
          );
        },
        { readOnly: true },
      );
    },
  };
}
