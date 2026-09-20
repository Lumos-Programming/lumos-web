import { readFile } from "node:fs/promises";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { D1Backend, type D1Client } from "./d1";
import { COLLECTIONS, type DocumentImage } from "./types";
import { encodeDocument, Timestamp } from "./values";

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
    const migration = await readFile(
      new URL("../../migrations/0001_database.sql", import.meta.url),
      "utf8",
    );
    await db.batch(
      migration
        .replace(/^--.*$/gm, "")
        .split(";")
        .map((sql) => sql.trim())
        .filter(Boolean)
        .map((sql) => db.prepare(sql)),
    );
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
      created_at: timestamp.toMillis(),
    });
    expect(String(rows.results?.[0].extra_fields)).not.toContain(
      "discordUsername",
    );
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
