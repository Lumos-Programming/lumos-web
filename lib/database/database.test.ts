import { readFile } from "node:fs/promises";
import { Timestamp as FirestoreTimestamp } from "firebase-admin/firestore";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Database, replayPendingEvents, type BackendFactory } from "./database";
import { D1Backend, type D1Client } from "./d1";
import { createFirestoreBackend, getFirestoreDb } from "./firestore";
import { copyDatabase, verifyDatabases } from "./migration";
import { getMigrationStage, MIGRATION_STAGES, stageBackends } from "./stage";
import { COLLECTIONS, type BackendName, type DatabaseBackend } from "./types";
import {
  applySet,
  decodeDocument,
  encodeDocument,
  FieldValue,
  Timestamp,
} from "./values";

describe("portable database values and stages", () => {
  it("normalizes nested write timestamps to Firestore microsecond precision", () => {
    const image = applySet(
      null,
      {
        at: new Timestamp(123, 456789123),
        nested: [{ at: new FirestoreTimestamp(-1, 999999999) }],
      },
      false,
      new Timestamp(0, 0),
    );
    expect(image.at).toEqual(new Timestamp(123, 456789000));
    expect(image.nested[0].at).toEqual(new Timestamp(-1, 999999000));
    expect(decodeDocument(encodeDocument(image))).toEqual(image);
  });

  it("keeps ordinary objects that resemble timestamp markers unchanged", () => {
    const document = {
      array: ["timestamp", 123, 456],
      object: { seconds: 123, nanoseconds: 456, type: "timestamp" },
      nested: { empty: {}, nullable: null },
    };
    expect(decodeDocument(encodeDocument(document))).toEqual(document);
  });

  it("defaults to Firestore alone and rejects misspelled stage slugs", () => {
    vi.stubEnv("DATABASE_MIGRATION_STAGE", undefined);
    expect(getMigrationStage()).toBe("firestore-only");
    expect(() => getMigrationStage("d1-prmary")).toThrow(
      "Invalid DATABASE_MIGRATION_STAGE",
    );
    expect(() => getMigrationStage("")).toThrow(
      "Invalid DATABASE_MIGRATION_STAGE",
    );
    vi.unstubAllEnvs();
  });

  it.each(MIGRATION_STAGES)(
    "%s blocks paused writes before initializing any backend or invoking business logic",
    async (stage) => {
      vi.stubEnv("DATABASE_WRITES_PAUSED", "true");
      const factory = vi.fn<BackendFactory>();
      const operation = vi.fn(async () => {});
      const database = new Database(factory, stage);
      try {
        await expect(database.runTransaction(operation)).rejects.toThrow(
          "Database writes are paused for migration",
        );
        await expect(
          database.doc("members/paused").set({ value: 1 }),
        ).rejects.toThrow("Database writes are paused for migration");
        expect(factory).not.toHaveBeenCalled();
        expect(operation).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
  "staged migration with real Firestore and D1",
  () => {
    let miniflare: Miniflare;
    let client: D1Client;
    let backends: Record<BackendName, DatabaseBackend>;
    let factory: BackendFactory;

    async function clearOwnedDatabase() {
      // This suite owns a separate emulator database, so whole-database copy
      // and verification cannot inspect or modify other suites' fixtures.
      const db = getFirestoreDb();
      const collections = await db.listCollections();
      for (const collection of collections) {
        const docs = await collection.listDocuments();
        if (!docs.length) continue;
        const batch = db.batch();
        for (const document of docs) batch.delete(document);
        await batch.commit();
      }
      await client.batch(
        [...COLLECTIONS, "migration_guard", "migration_outbox"].map((table) =>
          client.prepare(`DELETE FROM "${table}"`),
        ),
      );
    }

    beforeAll(async () => {
      vi.stubEnv("FIRESTORE_DATABASE_ID", "migration-integration-tests");
      miniflare = new Miniflare(
        convertV4MiniflareOptions({
          modules: true,
          script: "export default { fetch() { return new Response('ok'); } }",
          compatibilityDate: "2026-09-01",
          d1Databases: { DB: "facade-migration-test" },
        }),
      );
      const d1 = await miniflare.getD1Database("DB");
      client = d1;
      const migration = await readFile(
        new URL("../../migrations/0001_database.sql", import.meta.url),
        "utf8",
      );
      await d1.batch(
        migration
          .replace(/^--.*$/gm, "")
          .split(";")
          .map((sql) => sql.trim())
          .filter(Boolean)
          .map((sql) => d1.prepare(sql)),
      );
      backends = {
        firestore: createFirestoreBackend(),
        d1: new D1Backend(client),
      };
      factory = async (name) => backends[name];
    }, 30_000);

    beforeEach(clearOwnedDatabase);
    afterEach(async () => {
      vi.restoreAllMocks();
      await clearOwnedDatabase();
    });
    afterAll(async () => {
      await miniflare?.dispose();
      vi.unstubAllEnvs();
    });

    it.each(MIGRATION_STAGES)(
      "%s reads only its source of truth and writes only its configured destinations",
      async (stage) => {
        const path = "members/routing";
        for (const name of ["firestore", "d1"] as const) {
          await backends[name].applyReplica([
            {
              path,
              revision: 0,
              data: { discordUsername: `from-${name}` },
            },
          ]);
        }
        const routing = stageBackends(stage);
        const observedFactory = vi.fn(factory);
        const db = new Database(observedFactory, stage);
        expect((await db.doc(path).get()).data()?.discordUsername).toBe(
          `from-${routing.primary}`,
        );
        const query = await db
          .collection("members")
          .where("discordUsername", "==", `from-${routing.primary}`)
          .select("discordUsername")
          .get();
        expect(query.docs.map((document) => document.id)).toEqual(["routing"]);
        expect(
          observedFactory.mock.calls.every(
            ([name]) => name === routing.primary,
          ),
        ).toBe(true);

        await db.doc(path).update({ discordUsername: "updated" });
        expect(
          (await backends[routing.primary].get(path)).data?.discordUsername,
        ).toBe("updated");
        const other = routing.primary === "firestore" ? "d1" : "firestore";
        expect((await backends[other].get(path)).data?.discordUsername).toBe(
          routing.mirror ? "updated" : `from-${other}`,
        );
        expect(await backends[routing.primary].pendingEvents(10)).toEqual([]);
        const requested = new Set(
          observedFactory.mock.calls.map(([name]) => name),
        );
        expect(requested).toEqual(
          new Set(
            routing.mirror
              ? [routing.primary, routing.mirror]
              : [routing.primary],
          ),
        );
      },
    );

    it("copies legacy data and tombstones, verifies every cutover, then stops all Firestore writes", async () => {
      const initial = new Database(factory, "firestore-only");
      await initial.doc("members/current").set({
        discordUsername: "current",
        createdAt: FieldValue.serverTimestamp(),
      });
      await initial.doc("members/deleted-before-copy").delete();
      await getFirestoreDb()
        .doc("members/legacy")
        .set({
          discordUsername: "legacy",
          createdAt: new FirestoreTimestamp(123, 456789000),
        });
      expect((await backends.d1.get("members/current")).data).toBeNull();
      expect(
        (await copyDatabase(backends.firestore, backends.d1)).members,
      ).toBe(3);
      expect(
        (await verifyDatabases(backends.firestore, backends.d1)).matches,
      ).toBe(true);
      // The copy is resumable and revision zero legacy documents remain intact.
      await copyDatabase(backends.firestore, backends.d1);
      expect((await backends.d1.get("members/legacy")).data?.createdAt).toEqual(
        new Timestamp(123, 456789000),
      );

      const firestorePrimary = new Database(factory, "firestore-primary");
      const firstBatch = firestorePrimary.batch();
      firstBatch.update(firestorePrimary.doc("members/current"), {
        bio: "dual",
      });
      firstBatch.delete(firestorePrimary.doc("members/legacy"));
      await firstBatch.commit();
      expect(
        (await verifyDatabases(backends.firestore, backends.d1)).matches,
      ).toBe(true);

      const d1Primary = new Database(factory, "d1-primary");
      await d1Primary.doc("members/current").update({ bio: "D1 is primary" });
      await d1Primary.doc("news/new-after-cutover").set({
        title: "D1 write",
        createdAt: FieldValue.serverTimestamp(),
      });
      expect(
        (await verifyDatabases(backends.d1, backends.firestore)).matches,
      ).toBe(true);

      const retiredImage = await backends.firestore.get("members/current");
      const finalFactory = vi.fn(factory);
      const d1Only = new Database(finalFactory, "d1-only");
      await d1Only.doc("members/current").update({ bio: "D1 alone" });
      expect((await d1Only.doc("members/current").get()).data()?.bio).toBe(
        "D1 alone",
      );
      expect(await backends.firestore.get("members/current")).toEqual(
        retiredImage,
      );
      expect(finalFactory.mock.calls.every(([name]) => name === "d1")).toBe(
        true,
      );
      expect(await backends.d1.pendingEvents(10)).toEqual([]);
    });

    it.each(["firestore-primary", "d1-primary"] as const)(
      "%s persists a failed mirror delivery and replays exact images after restart",
      async (stage) => {
        const routing = stageBackends(stage);
        const source = backends[routing.primary];
        const target = backends[routing.mirror!];
        let unavailable = false;
        const unreliableFactory: BackendFactory = async (name) => {
          if (unavailable && name === routing.mirror) {
            throw new Error("mirror connection unavailable");
          }
          return backends[name];
        };
        const db = new Database(unreliableFactory, stage);
        const permanent = db.doc("news/permanent");
        const doomed = db.doc("news/deleted-during-outage");
        await permanent.set({ title: "before outage" });
        await doomed.set({ title: "delete me" });
        const staleImage = await source.get(doomed.path);
        unavailable = true;
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const created = db.collection("news").doc();
        const batch = db.batch();
        batch.update(permanent, {
          title: "committed while mirror is down",
          updatedAt: FieldValue.serverTimestamp(),
          precise: new Timestamp(123, 456789123),
        });
        batch.set(created, {
          title: "stable generated ID",
          createdAt: FieldValue.serverTimestamp(),
        });
        batch.delete(doomed);
        await expect(batch.commit()).resolves.toBeUndefined();
        expect(logged).toHaveBeenCalledWith(
          "database_mirror_pending",
          expect.objectContaining({
            primary: source.name,
            target: target.name,
          }),
        );
        const pending = await source.pendingEvents(10);
        expect(pending).toHaveLength(1);
        expect(
          pending[0].documents.map((document) => document.path).sort(),
        ).toEqual([permanent.path, created.path, doomed.path].sort());
        const committed = await source.get(permanent.path);
        expect(committed.data?.precise).toEqual(new Timestamp(123, 456789000));
        expect((await target.get(permanent.path)).data?.title).toBe(
          "before outage",
        );
        expect((await verifyDatabases(source, target)).matches).toBe(false);

        // Construct fresh adapters and a fresh factory: replay requires only
        // durable storage, not the request or its transaction callback.
        const restarted: Record<BackendName, DatabaseBackend> = {
          firestore: createFirestoreBackend(),
          d1: new D1Backend(client),
        };
        const replayFactory: BackendFactory = async (name) => restarted[name];
        expect(
          await replayPendingEvents(restarted[source.name], replayFactory),
        ).toEqual({
          delivered: 1,
          pending: false,
        });
        expect((await target.get(permanent.path)).data).toEqual(committed.data);
        expect((await target.get(created.path)).data).toEqual(
          (await source.get(created.path)).data,
        );
        expect(await target.get(doomed.path)).toMatchObject({
          data: null,
          revision: 1,
        });
        await target.applyReplica([staleImage]);
        expect((await target.get(doomed.path)).data).toBeNull();
        expect(
          await replayPendingEvents(restarted[source.name], replayFactory),
        ).toEqual({
          delivered: 0,
          pending: false,
        });
        expect((await verifyDatabases(source, target)).matches).toBe(true);
      },
    );

    it.each(["firestore-primary", "d1-primary"] as const)(
      "%s never delivers a mirror write or leaves an outbox when the primary fails",
      async (stage) => {
        const routing = stageBackends(stage);
        const source = backends[routing.primary];
        vi.spyOn(source, "commit").mockRejectedValue(
          new Error("primary unavailable"),
        );
        const observedFactory = vi.fn(factory);
        const db = new Database(observedFactory, stage);
        await expect(
          db.doc("members/failed").set({ discordUsername: "not committed" }),
        ).rejects.toThrow("primary unavailable");
        expect(
          observedFactory.mock.calls.every(
            ([name]) => name === routing.primary,
          ),
        ).toBe(true);
        expect((await source.get("members/failed")).revision).toBe(-1);
        expect(
          (await backends[routing.mirror!].get("members/failed")).revision,
        ).toBe(-1);
        expect(await source.pendingEvents(10)).toEqual([]);
      },
    );

    it.each(["firestore-primary", "d1-primary"] as const)(
      "%s resolves merge, nested deletion, dotted updates and server timestamps identically",
      async (stage) => {
        const db = new Database(factory, stage);
        const ref = db.doc("members/transforms");
        await ref.set({
          nested: {
            keep: "original",
            remove: "secret",
            preferences: { color: "red", enabled: true },
          },
          removeTop: true,
          list: [{ at: new Timestamp(123, 456789123) }],
        });
        await ref.set(
          {
            nested: {
              remove: FieldValue.delete(),
              preferences: { color: "blue" },
            },
            removeTop: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        await ref.update({
          "nested.preferences.enabled": FieldValue.delete(),
          "nested.keep": "updated",
          "fresh.nested": new Timestamp(456, 123456789),
        });
        const value = (await ref.get()).data()!;
        expect(value.nested).toEqual({
          keep: "updated",
          preferences: { color: "blue" },
        });
        expect(value).not.toHaveProperty("removeTop");
        expect(value.list).toEqual([{ at: new Timestamp(123, 456789000) }]);
        expect(value.fresh.nested).toEqual(new Timestamp(456, 123456000));
        expect(value.updatedAt).toBeInstanceOf(Timestamp);
        expect((await backends.firestore.get(ref.path)).data).toEqual(value);
        expect((await backends.d1.get(ref.path)).data).toEqual(value);
        await ref.set({ nested: {} }, { merge: true });
        expect((await ref.get()).data()?.nested).toEqual({});
        expect(
          (await verifyDatabases(backends.firestore, backends.d1)).matches,
        ).toBe(true);
      },
    );

    it.each(["firestore-primary", "d1-primary"] as const)(
      "%s retries concurrent weekly talk transactions without losing additions",
      async (stage) => {
        const db = new Database(factory, stage);
        const week = db.doc("weeks/concurrent");
        await week.set({ weekString: "concurrent", talks: [] });
        let firstReads = 0;
        let attempts = 0;
        let release!: () => void;
        const barrier = new Promise<void>((resolve) => {
          release = resolve;
        });
        await Promise.all(
          Array.from({ length: 4 }, (_, index) => {
            let firstAttempt = true;
            return db.runTransaction(async (transaction) => {
              attempts++;
              const snapshot = await transaction.get(week);
              const talks = snapshot.data()!.talks as {
                id: string;
                order: number;
              }[];
              if (firstAttempt) {
                firstAttempt = false;
                if (++firstReads === 4) release();
                await barrier;
              }
              transaction.update(week, {
                talks: [
                  ...talks,
                  { id: `talk-${index}`, order: talks.length + 1 },
                ],
              });
            });
          }),
        );
        const talks = (await week.get()).data()!.talks as {
          id: string;
          order: number;
        }[];
        expect(new Set(talks.map((talk) => talk.id))).toEqual(
          new Set(["talk-0", "talk-1", "talk-2", "talk-3"]),
        );
        expect(talks.map((talk) => talk.order)).toEqual([1, 2, 3, 4]);
        expect(attempts).toBeGreaterThan(4);
        expect((await backends.firestore.get(week.path)).data?.talks).toEqual(
          talks,
        );
        expect((await backends.d1.get(week.path)).data?.talks).toEqual(talks);
        expect(
          (await verifyDatabases(backends.firestore, backends.d1)).matches,
        ).toBe(true);
      },
      30_000,
    );
  },
);
