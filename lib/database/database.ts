import { getMigrationStage, stageBackends, type MigrationStage } from "./stage";
import {
  COLLECTIONS,
  splitPath,
  type BackendName,
  type CollectionName,
  type DatabaseBackend,
  type DocumentData,
  type DocumentImage,
  type OutboxEvent,
  type QuerySpec,
  type StoredDocument,
} from "./types";
import {
  applySet,
  applyUpdate,
  decodeDocument,
  encodeDocument,
  Timestamp,
} from "./values";

export type BackendFactory = (name: BackendName) => Promise<DatabaseBackend>;
type Mutation = {
  path: string;
  kind: "set" | "update" | "delete";
  data?: DocumentData;
  merge?: boolean;
};

export class DocumentSnapshot {
  readonly id: string;
  readonly exists: boolean;
  constructor(
    readonly ref: DocumentReference,
    private readonly value: DocumentData | null,
  ) {
    this.id = ref.id;
    this.exists = value !== null;
  }
  data(): DocumentData | undefined {
    return this.value === null
      ? undefined
      : decodeDocument(encodeDocument(this.value));
  }
}

class QueryDocumentSnapshot extends DocumentSnapshot {
  data(): DocumentData {
    return super.data()!;
  }
}

export class DocumentReference {
  readonly id: string;
  constructor(
    readonly database: Database,
    readonly path: string,
  ) {
    this.id = splitPath(path)[1];
  }
  async get(): Promise<DocumentSnapshot> {
    const stored = await (await this.database.primary()).get(this.path);
    return new DocumentSnapshot(this, stored.data);
  }
  async set(data: DocumentData, options?: { merge?: boolean }): Promise<void> {
    await this.database.write([
      { path: this.path, kind: "set", data, merge: options?.merge },
    ]);
  }
  async update(data: DocumentData): Promise<void> {
    await this.database.write([{ path: this.path, kind: "update", data }]);
  }
  async delete(): Promise<void> {
    await this.database.write([{ path: this.path, kind: "delete" }]);
  }
}

class Query {
  constructor(
    protected readonly database: Database,
    protected readonly spec: QuerySpec,
    private readonly fields?: string[],
  ) {}
  where(field: string, operator: "==" | "!=", value: unknown): Query {
    return new Query(
      this.database,
      {
        ...this.spec,
        filters: [...(this.spec.filters ?? []), { field, operator, value }],
      },
      this.fields,
    );
  }
  orderBy(field: string, direction: "asc" | "desc" = "asc"): Query {
    return new Query(
      this.database,
      { ...this.spec, order: { field, direction } },
      this.fields,
    );
  }
  limit(limit: number): Query {
    if (!Number.isSafeInteger(limit) || limit < 1)
      throw new Error("Query limit must be a positive integer");
    return new Query(this.database, { ...this.spec, limit }, this.fields);
  }
  select(...fields: string[]): Query {
    return new Query(this.database, this.spec, fields);
  }
  async get() {
    const rows = await (await this.database.primary()).query(this.spec);
    const docs = rows.map((row) => {
      const data = row.data!;
      const projected = this.fields
        ? Object.fromEntries(
            this.fields
              .filter((key) => key in data)
              .map((key) => [key, data[key]]),
          )
        : data;
      return new QueryDocumentSnapshot(this.database.doc(row.path), projected);
    });
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class CollectionReference extends Query {
  doc(id = crypto.randomUUID()): DocumentReference {
    return this.database.doc(`${this.spec.collection}/${id}`);
  }
}

export class WriteBatch {
  protected mutations: Mutation[] = [];
  constructor(protected readonly database: Database) {}
  protected check(ref: DocumentReference) {
    if (ref.database !== this.database)
      throw new Error("Document belongs to a different database instance");
  }
  set(
    ref: DocumentReference,
    data: DocumentData,
    options?: { merge?: boolean },
  ): this {
    this.check(ref);
    this.mutations.push({
      path: ref.path,
      kind: "set",
      data,
      merge: options?.merge,
    });
    return this;
  }
  update(ref: DocumentReference, data: DocumentData): this {
    this.check(ref);
    this.mutations.push({ path: ref.path, kind: "update", data });
    return this;
  }
  delete(ref: DocumentReference): this {
    this.check(ref);
    this.mutations.push({ path: ref.path, kind: "delete" });
    return this;
  }
  async commit(): Promise<void> {
    await this.database.write(this.mutations);
  }
}

export class Transaction extends WriteBatch {
  private reads = new Map<string, Promise<StoredDocument>>();
  constructor(
    database: Database,
    private readonly backend: DatabaseBackend,
  ) {
    super(database);
  }
  async get(ref: DocumentReference): Promise<DocumentSnapshot> {
    this.check(ref);
    if (this.mutations.length)
      throw new Error("Transaction reads must precede writes");
    return new DocumentSnapshot(ref, (await this.read(ref.path)).data);
  }
  private read(path: string): Promise<StoredDocument> {
    let value = this.reads.get(path);
    if (!value) {
      value = this.backend.get(path);
      this.reads.set(path, value);
    }
    return value;
  }
  async finish(
    now: Timestamp,
  ): Promise<{ checks: StoredDocument[]; documents: DocumentImage[] }> {
    // Blind writes also participate in optimistic concurrency, including merge
    // and batch writes, so a concurrent update cannot silently disappear.
    for (const mutation of this.mutations) this.read(mutation.path);
    const checks = await Promise.all(this.reads.values());
    const original = new Map(checks.map((row) => [row.path, row]));
    const images = new Map<string, DocumentImage>();
    for (const mutation of this.mutations) {
      const stored = original.get(mutation.path)!;
      const previous = images.has(mutation.path)
        ? images.get(mutation.path)!.data
        : stored.data;
      const data =
        mutation.kind === "delete"
          ? null
          : mutation.kind === "update"
            ? applyUpdate(previous, mutation.data!, now)
            : applySet(previous, mutation.data!, mutation.merge ?? false, now);
      images.set(mutation.path, {
        path: mutation.path,
        data,
        revision: stored.revision + 1,
      });
    }
    return { checks, documents: [...images.values()] };
  }
  // Transactions are committed by Database after the callback returns.
  async commit(): Promise<never> {
    throw new Error("Do not call commit inside a transaction");
  }
}

export class Database {
  readonly stage: MigrationStage;
  private readonly routing: ReturnType<typeof stageBackends>;
  constructor(
    private readonly factory: BackendFactory,
    stage = getMigrationStage(),
  ) {
    this.stage = stage;
    this.routing = stageBackends(stage);
  }
  primary(): Promise<DatabaseBackend> {
    return this.factory(this.routing.primary);
  }
  collection(collection: string): CollectionReference {
    if (!COLLECTIONS.includes(collection as CollectionName))
      throw new Error(`Unsupported database collection: ${collection}`);
    return new CollectionReference(this, {
      collection: collection as CollectionName,
    });
  }
  doc(path: string): DocumentReference {
    return new DocumentReference(this, path);
  }
  batch(): WriteBatch {
    return new WriteBatch(this);
  }
  async write(mutations: Mutation[]): Promise<void> {
    if (!mutations.length) return;
    await this.runTransaction(async (tx) => {
      for (const mutation of mutations) {
        const ref = this.doc(mutation.path);
        if (mutation.kind === "delete") tx.delete(ref);
        else if (mutation.kind === "update") tx.update(ref, mutation.data!);
        else tx.set(ref, mutation.data!, { merge: mutation.merge });
      }
    });
  }
  async runTransaction<T>(
    operation: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    if (process.env.DATABASE_WRITES_PAUSED === "true")
      throw new Error("Database writes are paused for migration");
    const backend = await this.primary();
    const now = Timestamp.now();
    const eventId = crypto.randomUUID();
    for (let attempt = 0; attempt < 8; attempt++) {
      const tx = new Transaction(this, backend);
      const result = await operation(tx);
      const request = await tx.finish(now);
      const outbox: OutboxEvent | undefined =
        request.documents.length && this.routing.mirror
          ? {
              id: eventId,
              target: this.routing.mirror,
              createdAt: now.toMillis(),
              documents: request.documents,
            }
          : undefined;
      if (await backend.commit({ ...request, outbox })) {
        if (outbox) {
          try {
            await deliverEvent(backend, this.factory, outbox);
          } catch {
            // The primary already committed. Reporting the operation as failed
            // could duplicate external side effects; the durable outbox retries it.
            console.error("database_mirror_pending", {
              eventId,
              primary: backend.name,
              target: outbox.target,
            });
          }
        }
        return result;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(5 * 2 ** attempt, 100)),
      );
    }
    throw new Error(
      "Database transaction conflicted too many times; retry the operation",
    );
  }
}

export async function deliverEvent(
  source: DatabaseBackend,
  factory: BackendFactory,
  event: OutboxEvent,
): Promise<void> {
  if (event.target === source.name)
    throw new Error("Migration event cannot target its source");
  await (await factory(event.target)).applyReplica(event.documents);
  await source.acknowledgeEvent(event.id);
}

export async function replayPendingEvents(
  source: DatabaseBackend,
  factory: BackendFactory,
  limit = 100,
) {
  const events = await source.pendingEvents(limit);
  let delivered = 0;
  for (const event of events) {
    await deliverEvent(source, factory, event);
    delivered++;
  }
  return { delivered, pending: (await source.pendingEvents(1)).length > 0 };
}
