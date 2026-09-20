import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Timestamp as FirestoreTimestamp } from "firebase-admin/firestore";
import { createFirestoreBackend, getFirestoreDb } from "./firestore";
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
      batch.delete(db.collection("_migration_outbox").doc(eventId));
      await batch.commit();
    }

    beforeEach(clean);
    afterEach(clean);

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
      expect(
        (await restarted.pendingEvents(100)).find((e) => e.id === eventId),
      ).toBeUndefined();
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
  },
);
