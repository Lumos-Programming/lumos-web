import { readFile } from "node:fs/promises";
import { Timestamp as FirestoreTimestamp } from "firebase-admin/firestore";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { D1Backend, type D1Client } from "./d1";
import { replayPendingEvents } from "./database";
import { COLLECTIONS, type DocumentImage, type OutboxEvent } from "./types";
import { encodeDocument, Timestamp } from "./values";

async function applyMigration(client: D1Client, file: string) {
  const migration = await readFile(
    new URL(`../../migrations/${file}`, import.meta.url),
    "utf8",
  );
  await client.batch(
    migration
      .replace(/^--.*$/gm, "")
      .split(";")
      .map((sql) => sql.trim())
      .filter(Boolean)
      .map((sql) => client.prepare(sql)),
  );
}

describe("D1 storage on the Workers SQLite runtime", () => {
  let miniflare: Miniflare;
  let client: D1Client;
  let backend: D1Backend;

  beforeAll(async () => {
    miniflare = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: "export default { fetch() { return new Response('ok'); } }",
        compatibilityDate: "2026-09-01",
        d1Databases: { DB: "migration-test" },
      }),
    );
    const db = await miniflare.getD1Database("DB");
    client = db;
    await applyMigration(client, "0001_database.sql");
    await applyMigration(client, "0002_outbox_chunks.sql");
    backend = new D1Backend(client);
  }, 30_000);

  beforeEach(async () => {
    await client.batch(
      [...COLLECTIONS, "migration_guard", "migration_outbox"].map((table) =>
        client.prepare(`DELETE FROM "${table}"`),
      ),
    );
  });

  afterAll(async () => {
    await miniflare?.dispose();
  });

  it("preserves timestamps, nested talks, missing/null, unknown and malformed legacy fields", async () => {
    const timestamp = new Timestamp(1_700_000_000, 123456789);
    const documents: DocumentImage[] = [
      {
        path: "members/person",
        revision: 0,
        data: {
          discordUsername: "Name",
          createdAt: timestamp,
          optedOut: false,
          lineId: null,
          birthDate: 123,
          visibility: { bio: "private" },
          customLegacy: { history: [timestamp, null] },
        },
      },
      {
        path: "weeks/2026-09-21",
        revision: 0,
        data: {
          weekString: "2026-09-21",
          talks: [{ id: "talk", title: "Nested", createdAt: timestamp }],
        },
      },
    ];
    await backend.applyReplica(documents);
    for (const document of documents) {
      const stored = await backend.get(document.path);
      expect(encodeDocument(stored.data!)).toBe(encodeDocument(document.data!));
    }
    const member = (await backend.get("members/person")).data!;
    expect(member).not.toHaveProperty("line");
    expect(member.lineId).toBeNull();
    expect(member.createdAt.nanoseconds).toBe(123456789);
    const rows = await client
      .prepare(
        "SELECT discord_username, opted_out, created_at, extra_fields FROM members WHERE id = 'person'",
      )
      .all();
    expect(rows.results?.[0]).toMatchObject({
      discord_username: "Name",
      opted_out: 0,
      created_at: 1_700_000_000_123.4568,
    });
    expect(String(rows.results?.[0].extra_fields)).not.toContain(
      "discordUsername",
    );
  });

  it("keeps submillisecond timestamp ordering and equality distinct", async () => {
    const earlier = new Timestamp(1_700_000_000, 123100000);
    const later = new Timestamp(1_700_000_000, 123900000);
    expect(earlier.toMillis()).toBe(later.toMillis());
    await backend.applyReplica([
      {
        path: "news/a-later",
        revision: 0,
        data: { publishedAt: later },
      },
      {
        path: "news/z-earlier",
        revision: 0,
        data: { publishedAt: earlier },
      },
    ]);

    expect(
      (
        await backend.query({
          collection: "news",
          order: { field: "publishedAt", direction: "desc" },
        })
      ).map((document) => document.path),
    ).toEqual(["news/a-later", "news/z-earlier"]);
    for (const timestamp of [
      later,
      new FirestoreTimestamp(later.seconds, later.nanoseconds),
    ]) {
      expect(
        (
          await backend.query({
            collection: "news",
            filters: [
              { field: "publishedAt", operator: "==", value: timestamp },
            ],
          })
        ).map((document) => document.path),
      ).toEqual(["news/a-later"]);
    }
  });

  it("queries indexed scalar columns while respecting null and missing fields", async () => {
    await backend.applyReplica([
      {
        path: "members/a",
        revision: 0,
        data: {
          onboardingCompleted: true,
          allowPublic: true,
          lineId: "line-a",
        },
      },
      {
        path: "members/b",
        revision: 0,
        data: { onboardingCompleted: true, allowPublic: false, lineId: null },
      },
      { path: "members/c", revision: 0, data: { onboardingCompleted: true } },
      { path: "members/deleted", revision: 0, data: null },
      {
        path: "blogs/old",
        revision: 0,
        data: { authorId: "a", publishedAt: "2020-01-01" },
      },
      {
        path: "blogs/new",
        revision: 0,
        data: { authorId: "a", publishedAt: "2026-01-01" },
      },
      { path: "blogs/missing", revision: 0, data: { authorId: "a" } },
    ]);
    expect(
      (
        await backend.query({
          collection: "members",
          filters: [
            { field: "onboardingCompleted", operator: "==", value: true },
            { field: "allowPublic", operator: "==", value: true },
          ],
        })
      ).map((doc) => doc.path),
    ).toEqual(["members/a"]);
    expect(
      (
        await backend.query({
          collection: "members",
          filters: [{ field: "lineId", operator: "!=", value: null }],
        })
      ).map((doc) => doc.path),
    ).toEqual(["members/a"]);
    expect(
      (
        await backend.query({
          collection: "members",
          filters: [{ field: "lineId", operator: "==", value: null }],
        })
      ).map((doc) => doc.path),
    ).toEqual(["members/b"]);
    expect(
      (
        await backend.query({
          collection: "blogs",
          order: { field: "publishedAt", direction: "desc" },
          limit: 1,
        })
      ).map((doc) => doc.path),
    ).toEqual(["blogs/new"]);
    expect(
      (await backend.scan("members", "b", 2)).map((doc) => [
        doc.path,
        doc.data === null,
      ]),
    ).toEqual([
      ["members/c", false],
      ["members/deleted", true],
    ]);
  });

  it("rolls back all writes and outbox on a stale read, even when the read document is not written", async () => {
    await backend.applyReplica([
      {
        path: "members/owner",
        revision: 0,
        data: { discordUsername: "original" },
      },
    ]);
    const owner = await backend.get("members/owner");
    const sub = await backend.get("members/sub");
    await backend.applyReplica([
      {
        path: "members/owner",
        revision: 1,
        data: { discordUsername: "changed" },
      },
    ]);
    const documents: DocumentImage[] = [
      { path: "members/sub", revision: 0, data: { primaryDiscordId: "owner" } },
    ];
    expect(
      await backend.commit({
        checks: [sub, owner],
        documents,
        outbox: { id: "event", target: "firestore", createdAt: 1, documents },
      }),
    ).toBe(false);
    expect((await backend.get("members/sub")).revision).toBe(-1);
    expect((await backend.get("members/owner")).data?.discordUsername).toBe(
      "changed",
    );
    expect(await backend.pendingEvents(10)).toEqual([]);
    expect(
      (await client.prepare("SELECT * FROM migration_outbox_chunks").all())
        .results,
    ).toEqual([]);
  });

  it("commits both member images and a timestamp-preserving outbox atomically", async () => {
    const documents: DocumentImage[] = [
      {
        path: "members/main",
        revision: 0,
        data: { subAccountDiscordId: "sub" },
      },
      {
        path: "members/sub",
        revision: 0,
        data: { primaryDiscordId: "main", createdAt: new Timestamp(1, 1) },
      },
    ];
    const event = {
      id: "link",
      target: "firestore" as const,
      createdAt: 123,
      documents,
    };
    expect(
      await backend.commit({
        checks: await Promise.all(
          documents.map((doc) => backend.get(doc.path)),
        ),
        documents,
        outbox: event,
      }),
    ).toBe(true);
    expect(await backend.pendingEvents(10)).toEqual([event]);
    expect((await backend.get("members/main")).data?.subAccountDiscordId).toBe(
      "sub",
    );
    await backend.acknowledgeEvent("link");
    await backend.acknowledgeEvent("link");
    expect(await backend.pendingEvents(10)).toEqual([]);
    expect(
      (await client.prepare("SELECT * FROM migration_outbox_chunks").all())
        .results,
    ).toEqual([]);
  });

  it("restarts and replays a multi-document event exceeding the D1 row limit, then cascades chunk cleanup", async () => {
    const documents: DocumentImage[] = ["a", "b", "c"].map((id) => ({
      path: `news/${id}`,
      revision: 0,
      data: {
        body: "\\😀".repeat(120_000),
        createdAt: new Timestamp(123, 456000),
      },
    }));
    const event: OutboxEvent = {
      id: "large",
      target: "firestore",
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
    await backend.commit({
      checks: [],
      documents: [],
      outbox: { id: "later", target: "firestore", createdAt: 1, documents: [] },
    });
    const chunks = await client
      .prepare(
        "SELECT length(payload) AS size FROM migration_outbox_chunks WHERE event_id = 'large'",
      )
      .all();
    expect(chunks.results!.length).toBeGreaterThan(1);
    for (const chunk of chunks.results!)
      expect(chunk.size).toBeLessThanOrEqual(256 * 1024);
    const restarted = new D1Backend(client);
    expect(await restarted.pendingEvents(1)).toEqual([event]);
    const received: DocumentImage[][] = [];
    expect(
      await replayPendingEvents(
        restarted,
        async () => ({
          name: "firestore",
          get: backend.get.bind(backend),
          query: backend.query.bind(backend),
          commit: backend.commit.bind(backend),
          applyReplica: async (images) => {
            received.push(images);
          },
          pendingEvents: backend.pendingEvents.bind(backend),
          acknowledgeEvent: backend.acknowledgeEvent.bind(backend),
          scan: backend.scan.bind(backend),
        }),
        1,
      ),
    ).toEqual({ delivered: 1, pending: true });
    expect(received).toEqual([documents]);
    expect(
      (
        await client
          .prepare(
            "SELECT * FROM migration_outbox_chunks WHERE event_id = 'large'",
          )
          .all()
      ).results,
    ).toEqual([]);
    expect(
      (await restarted.pendingEvents(1)).map((pending) => pending.id),
    ).toEqual(["later"]);
  });

  it("rolls back images and the header when a chunk insert fails", async () => {
    await client
      .prepare(
        "CREATE TRIGGER reject_outbox_chunk BEFORE INSERT ON migration_outbox_chunks BEGIN SELECT RAISE(ABORT, 'test chunk failure'); END",
      )
      .all();
    try {
      const document: DocumentImage = {
        path: "news/rollback",
        revision: 0,
        data: { title: "must roll back" },
      };
      await expect(
        backend.commit({
          checks: [await backend.get(document.path)],
          documents: [document],
          outbox: {
            id: "failed",
            target: "firestore",
            createdAt: 0,
            documents: [document],
          },
        }),
      ).rejects.toThrow("test chunk failure");
      expect((await backend.get(document.path)).revision).toBe(-1);
      expect(await backend.pendingEvents(10)).toEqual([]);
      expect(
        (await client.prepare("SELECT * FROM migration_outbox_chunks").all())
          .results,
      ).toEqual([]);
    } finally {
      await client.prepare("DROP TRIGGER reject_outbox_chunk").all();
    }
  });

  it("allows only one competing compare-and-swap and rejects stale deletion resurrection", async () => {
    const initial = await backend.get("weeks/week");
    const results = await Promise.all(
      ["first", "second"].map((title) =>
        backend.commit({
          checks: [initial],
          documents: [
            { path: initial.path, revision: 0, data: { talks: [{ title }] } },
          ],
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    await backend.applyReplica([
      { path: initial.path, revision: 5, data: null },
    ]);
    await backend.applyReplica([
      { path: initial.path, revision: 4, data: { talks: ["stale"] } },
      { path: initial.path, revision: 5, data: { talks: ["duplicate"] } },
    ]);
    expect(await backend.get(initial.path)).toMatchObject({
      revision: 5,
      data: null,
    });
    expect(await backend.query({ collection: "weeks" })).toEqual([]);
    await backend.applyReplica([
      { path: initial.path, revision: 6, data: { talks: ["recreated"] } },
    ]);
    expect((await backend.get(initial.path)).data?.talks).toEqual([
      "recreated",
    ]);
  });

  it("does not swallow unrelated database errors or leave a partial commit", async () => {
    const event = {
      id: "duplicate",
      target: "firestore" as const,
      createdAt: 1,
      documents: [],
    };
    await backend.commit({ checks: [], documents: [], outbox: event });
    const missing = await backend.get("blogs/new");
    await expect(
      backend.commit({
        checks: [missing],
        documents: [
          { path: missing.path, revision: 0, data: { title: "rolled back" } },
        ],
        outbox: event,
      }),
    ).rejects.toThrow();
    expect((await backend.get(missing.path)).revision).toBe(-1);
  });
});

describe("D1 outbox schema upgrade", () => {
  let miniflare: Miniflare;

  beforeAll(() => {
    miniflare = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: "export default { fetch() { return new Response('ok'); } }",
        compatibilityDate: "2026-09-01",
        d1Databases: { EMPTY: "upgrade-empty", PENDING: "upgrade-pending" },
      }),
    );
  });

  afterAll(async () => {
    await miniflare?.dispose();
  });

  it("upgrades an empty legacy outbox and preserves application data", async () => {
    const client = await miniflare.getD1Database("EMPTY");
    await applyMigration(client, "0001_database.sql");
    const backend = new D1Backend(client);
    const document: DocumentImage = {
      path: "news/retained",
      revision: 2,
      data: { title: "Keep this article" },
    };
    await backend.applyReplica([document]);

    await applyMigration(client, "0002_outbox_chunks.sql");

    expect(await backend.get(document.path)).toMatchObject(document);
    expect(await backend.pendingEvents(1)).toEqual([]);
    const event: OutboxEvent = {
      id: "new-format",
      target: "firestore",
      createdAt: 0,
      documents: [document],
    };
    await backend.commit({ checks: [], documents: [], outbox: event });
    expect(await backend.pendingEvents(1)).toEqual([event]);
  });

  it("rejects an undrained legacy outbox without changing its schema or payload", async () => {
    const client = await miniflare.getD1Database("PENDING");
    await applyMigration(client, "0001_database.sql");
    const payload = JSON.stringify([
      {
        path: "news/pending",
        revision: 1,
        data: ["object", [["title", ["scalar", "Undelivered article"]]]],
      },
    ]);
    await client
      .prepare(
        "INSERT INTO migration_outbox (id, target, created_at, documents) VALUES ('legacy', 'firestore', 123, ?)",
      )
      .bind(payload)
      .all();

    await expect(
      applyMigration(client, "0002_outbox_chunks.sql"),
    ).rejects.toThrow("migration_outbox_must_be_drained_before_upgrade");

    expect(
      (await client.prepare("SELECT * FROM migration_outbox").all()).results,
    ).toEqual([
      {
        id: "legacy",
        target: "firestore",
        created_at: 123,
        documents: payload,
      },
    ]);
    expect(
      (
        await client
          .prepare(
            "SELECT name FROM sqlite_master WHERE name IN ('migration_outbox_upgrade_guard', 'migration_outbox_chunks')",
          )
          .all()
      ).results,
    ).toEqual([]);
    await client
      .prepare("DELETE FROM migration_outbox WHERE id = 'legacy'")
      .all();
    await applyMigration(client, "0002_outbox_chunks.sql");
    expect(await new D1Backend(client).pendingEvents(1)).toEqual([]);
  });
});
