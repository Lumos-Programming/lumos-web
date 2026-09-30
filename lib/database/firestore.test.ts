import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp as FirestoreTimestamp } from "firebase-admin/firestore";
import { createFirestoreBackend, getFirestoreDb } from "./firestore";
import { Database, replayPendingEvents } from "./database";
import { Timestamp } from "./values";
import type { DocumentImage, OutboxEvent } from "./types";

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
  "Firestore migration backend",
  () => {
    const paths = [
      "system/__adapter_a",
      "system/__adapter_b",
      "system/__adapter_c",
      "system/__adapter_unicode_\uE000",
      "system/__adapter_unicode_😀",
      "surveys/__adapter_foreign",
      "weeks/__adapter_foreign",
      "news/__adapter_large_a",
      "news/__adapter_large_b",
      "news/__adapter_large_c",
    ];
    const eventId = "__adapter_event";
    const backend = createFirestoreBackend();

    async function clean() {
      const db = getFirestoreDb();
      const batch = db.batch();
      for (const path of paths) {
        batch.delete(db.doc(path));
        batch.delete(
          db.collection("_migration_versions").doc(encodeURIComponent(path)),
        );
      }
      for (const id of [eventId, `${eventId}_later`]) {
        const ref = db.collection("_migration_outbox").doc(id);
        for (const chunk of (await ref.collection("chunks").get()).docs)
          batch.delete(chunk.ref);
        batch.delete(ref);
      }
      await batch.commit();
    }

    beforeEach(clean);
    afterEach(clean);
    afterEach(() => vi.restoreAllMocks());

    it("queries application data without reading migration metadata or opening a transaction", async () => {
      const db = getFirestoreDb();
      await db.doc(paths[0]).set({
        value: "query result",
        createdAt: new FirestoreTimestamp(123, 456000),
      });
      await db
        .collection("_migration_versions")
        .doc(encodeURIComponent(paths[0]))
        .set({ revision: "invalid metadata" });
      const transaction = vi.spyOn(db, "runTransaction");

      expect(
        await backend.query({
          collection: "system",
          filters: [{ field: "value", operator: "==", value: "query result" }],
        }),
      ).toEqual([
        {
          path: paths[0],
          data: {
            value: "query result",
            createdAt: new Timestamp(123, 456000),
          },
        },
      ]);
      expect(transaction).not.toHaveBeenCalled();
    });

    it("reads legacy documents at revision zero and preserves submillisecond timestamp precision", async () => {
      const missing = await backend.get(paths[0]);
      expect(missing).toMatchObject({ data: null, revision: -1 });
      await getFirestoreDb()
        .doc(paths[0])
        .set({
          createdAt: new FirestoreTimestamp(123, 456000),
          nested: { times: [new FirestoreTimestamp(567, 123000)] },
        });
      const document = await backend.get(paths[0]);
      expect(document.revision).toBe(0);
      expect(document.data?.createdAt).toEqual(new Timestamp(123, 456000));
      expect(document.data?.nested.times[0]).toEqual(
        new Timestamp(567, 123000),
      );
      expect(document.token).not.toBe(missing.token);
    });

    it("rejects stale reads, including external writes without migration metadata", async () => {
      const ref = getFirestoreDb().doc(paths[0]);
      await ref.set({ value: "before" });
      const check = await backend.get(paths[0]);
      await ref.set({ value: "external change" });
      const image: DocumentImage = {
        path: paths[0],
        data: { value: "stale write" },
        revision: 1,
      };
      const committed = await backend.commit({
        checks: [check],
        documents: [image],
        outbox: {
          id: eventId,
          target: "d1",
          createdAt: 1,
          documents: [image],
        },
      });
      expect(committed).toBe(false);
      expect((await backend.get(paths[0])).data?.value).toBe("external change");
      expect(
        (
          await getFirestoreDb()
            .collection("_migration_outbox")
            .doc(eventId)
            .get()
        ).exists,
      ).toBe(false);
      expect(
        (
          await getFirestoreDb()
            .collection("_migration_outbox")
            .doc(eventId)
            .collection("chunks")
            .get()
        ).empty,
      ).toBe(true);
    });

    it("commits full images and a durable portable outbox together", async () => {
      const documents: DocumentImage[] = [
        {
          path: paths[0],
          data: { createdAt: new Timestamp(123, 987654000), value: "new" },
          revision: 0,
        },
        { path: paths[1], data: null, revision: 0 },
      ];
      const event: OutboxEvent = {
        id: eventId,
        target: "d1",
        createdAt: 0,
        documents,
      };
      expect(
        await backend.commit({
          checks: await Promise.all(paths.slice(0, 2).map(backend.get)),
          documents,
          outbox: event,
        }),
      ).toBe(true);
      expect((await backend.get(paths[0])).data).toEqual(documents[0].data);
      expect(await backend.get(paths[1])).toMatchObject({
        data: null,
        revision: 0,
      });
      const restarted = createFirestoreBackend();
      expect(
        (await restarted.pendingEvents(100)).find((e) => e.id === eventId),
      ).toEqual(event);
      await restarted.acknowledgeEvent(eventId);
      await restarted.acknowledgeEvent(eventId);
      expect(
        (await restarted.pendingEvents(100)).find((e) => e.id === eventId),
      ).toBeUndefined();
      expect(
        (
          await getFirestoreDb()
            .collection("_migration_outbox")
            .doc(eventId)
            .collection("chunks")
            .get()
        ).empty,
      ).toBe(true);
    });

    it("updates a valid large legacy news article with a durable outbox", async () => {
      const ref = getFirestoreDb().doc("news/__adapter_large_a");
      const body = "\\".repeat(300_000);
      await ref.set({ body, title: "Before" });
      const delivery = vi.fn(async () => {});
      const database = new Database(
        async (name) =>
          name === "firestore"
            ? backend
            : { ...backend, name: "d1", applyReplica: delivery },
        "firestore-primary",
      );

      await database.doc(ref.path).update({ title: "After" });

      expect((await ref.get()).data()).toEqual({ body, title: "After" });
      expect(delivery).toHaveBeenCalledWith([
        { path: ref.path, revision: 1, data: { body, title: "After" } },
      ]);
    });

    it("restarts and replays a multi-document event exceeding one MiB, then deletes every chunk", async () => {
      const documents: DocumentImage[] = paths.slice(-3).map((path) => ({
        path,
        revision: 0,
        data: {
          body: "\\😀".repeat(120_000),
          createdAt: new Timestamp(123, 456000),
        },
      }));
      const event: OutboxEvent = {
        id: eventId,
        target: "d1",
        createdAt: 0,
        documents,
      };
      expect(
        await backend.commit({
          checks: await Promise.all(
            documents.map((document) => backend.get(document.path)),
          ),
          documents,
          outbox: event,
        }),
      ).toBe(true);
      const ref = getFirestoreDb().collection("_migration_outbox").doc(eventId);
      const chunks = await ref.collection("chunks").get();
      expect(chunks.size).toBeGreaterThan(1);
      for (const chunk of chunks.docs)
        expect(Buffer.byteLength(chunk.get("payload"))).toBeLessThanOrEqual(
          256 * 1024,
        );
      const restarted = createFirestoreBackend();
      expect((await restarted.pendingEvents(1))[0]).toEqual(event);
      const applyReplica = vi.fn(async () => {});
      expect(
        await replayPendingEvents(
          restarted,
          async () => ({ ...backend, name: "d1", applyReplica }),
          1,
        ),
      ).toEqual({ delivered: 1, pending: false });
      expect(applyReplica).toHaveBeenCalledWith(documents);
      expect((await ref.get()).exists).toBe(false);
      expect((await ref.collection("chunks").get()).empty).toBe(true);
    });

    it("rolls back images and the outbox header when creating a chunk fails", async () => {
      const ref = getFirestoreDb().collection("_migration_outbox").doc(eventId);
      await ref
        .collection("chunks")
        .doc("0")
        .set({ payload: "existing chunk" });
      const document: DocumentImage = {
        path: paths[0],
        revision: 0,
        data: { value: "must roll back" },
      };
      await expect(
        backend.commit({
          checks: [await backend.get(document.path)],
          documents: [document],
          outbox: {
            id: eventId,
            target: "d1",
            createdAt: 0,
            documents: [document],
          },
        }),
      ).rejects.toThrow();
      expect((await backend.get(document.path)).revision).toBe(-1);
      expect((await ref.get()).exists).toBe(false);
      expect((await ref.collection("chunks").get()).size).toBe(1);
    });

    it("reads all chunks from the header snapshot during concurrent acknowledgement", async () => {
      const document: DocumentImage = {
        path: paths[0],
        revision: 0,
        data: { value: "snapshot" },
      };
      const event: OutboxEvent = {
        id: eventId,
        target: "d1",
        createdAt: 0,
        documents: [document],
      };
      await backend.commit({
        checks: [await backend.get(document.path)],
        documents: [document],
        outbox: event,
      });
      const db = getFirestoreDb();
      const runTransaction = db.runTransaction.bind(db);
      const snapshotRead = vi
        .spyOn(db, "runTransaction")
        .mockImplementation((operation, options) =>
          runTransaction(async (transaction) => {
            if (options?.readOnly) {
              const getAll = transaction.getAll.bind(transaction);
              vi.spyOn(transaction, "getAll").mockImplementation(
                async (...args) => {
                  await backend.acknowledgeEvent(eventId);
                  return getAll(...args);
                },
              );
            }
            return operation(transaction);
          }, options),
        );
      expect(await backend.pendingEvents(1)).toEqual([event]);
      snapshotRead.mockRestore();
      expect(await backend.pendingEvents(1)).toEqual([]);
    });

    it("applies an initial revision zero and prevents stale resurrection after deletion", async () => {
      await backend.applyReplica([
        { path: paths[0], data: { value: "initial copy" }, revision: 0 },
      ]);
      expect((await backend.get(paths[0])).data?.value).toBe("initial copy");
      await backend.applyReplica([{ path: paths[0], data: null, revision: 2 }]);
      await backend.applyReplica([
        { path: paths[0], data: { value: "old event" }, revision: 1 },
        { path: paths[0], data: { value: "equal revision" }, revision: 2 },
      ]);
      expect(await backend.get(paths[0])).toMatchObject({
        data: null,
        revision: 2,
      });
    });

    it("paginates legacy documents and versioned deletion markers in ID order", async () => {
      await getFirestoreDb().doc(paths[0]).set({ value: "legacy" });
      await backend.applyReplica([
        { path: paths[1], data: null, revision: 3 },
        { path: paths[2], data: { value: "replicated" }, revision: 1 },
      ]);
      const first = await backend.scan("system", "__adapter_", 2);
      expect(first.map((doc) => [doc.path, doc.revision])).toEqual([
        [paths[0], 0],
        [paths[1], 3],
      ]);
      expect(first[1].data).toBeNull();
      const next = await backend.scan("system", "__adapter_b", 1);
      expect(next.map((doc) => doc.path)).toEqual([paths[2]]);
    });

    it("paginates Unicode legacy IDs and tombstones using Firestore UTF-8 order", async () => {
      await getFirestoreDb().doc(paths[3]).set({ value: "legacy Unicode ID" });
      await backend.applyReplica([{ path: paths[4], data: null, revision: 1 }]);
      const first = await backend.scan("system", "__adapter_unicode_", 1);
      expect(first.map((document) => document.path)).toEqual([paths[3]]);
      const second = await backend.scan("system", paths[3].split("/")[1], 1);
      expect(second.map((document) => document.path)).toEqual([paths[4]]);
      expect(second[0].data).toBeNull();
    });

    it("merges bounded live and metadata pages without duplicates or foreign collection records", async () => {
      const db = getFirestoreDb();
      await db.doc(paths[0]).set({ value: "legacy" });
      await db.doc(paths[3]).set({ value: "legacy Unicode ID" });
      await backend.applyReplica([
        { path: paths[1], data: null, revision: 3 },
        { path: paths[2], data: { value: "replicated" }, revision: 1 },
        { path: paths[4], data: null, revision: 2 },
        { path: paths[5], data: null, revision: 1 },
        { path: paths[6], data: null, revision: 1 },
      ]);

      const first = await backend.scan("system", undefined, 2);
      expect(first.map((document) => document.path)).toEqual(paths.slice(0, 2));
      const second = await backend.scan(
        "system",
        first[1].path.split("/")[1],
        2,
      );
      expect(second.map((document) => document.path)).toEqual(
        paths.slice(2, 4),
      );
      const third = await backend.scan(
        "system",
        second[1].path.split("/")[1],
        2,
      );
      expect(third.map((document) => document.path)).toEqual([paths[4]]);
      expect(third[0].data).toBeNull();
      expect(await backend.scan("system", paths[4].split("/")[1], 2)).toEqual(
        [],
      );
    });
  },
);
