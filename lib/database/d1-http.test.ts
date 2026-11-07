import { afterEach, describe, expect, it, vi } from "vitest";
import { D1Backend } from "./d1";
import { D1HttpClient } from "./d1-http";

afterEach(() => vi.unstubAllGlobals());

describe("D1 HTTP transport", () => {
  it("sends parameterized statements in one atomic API batch", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        result: [
          { success: true, results: [{ id: "a" }] },
          { success: true, results: [] },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new D1HttpClient("account", "database", "private-token");
    const result = await client.batch([
      client.prepare("SELECT * FROM members WHERE id = ?").bind("a"),
      client
        .prepare("UPDATE members SET nickname = ? WHERE id = ?")
        .bind("A ' quote", "a"),
    ]);
    expect(result[0].results).toEqual([{ id: "a" }]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account/d1/database/database/query",
    );
    expect(JSON.parse(String(request?.body))).toEqual({
      batch: [
        { sql: "SELECT * FROM members WHERE id = ?", params: ["a"] },
        {
          sql: "UPDATE members SET nickname = ? WHERE id = ?",
          params: ["A ' quote", "a"],
        },
      ],
    });
    expect(request?.headers).toMatchObject({
      Authorization: "Bearer private-token",
    });
  });

  it("preserves the named conflict so the primary transaction retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            success: false,
            errors: [
              {
                message: "CHECK constraint failed: migration_revision_matches",
              },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    const backend = new D1Backend(
      new D1HttpClient("account", "database", "token"),
    );
    expect(
      await backend.commit({
        checks: [{ path: "members/a", data: null, revision: -1, token: "-1" }],
        documents: [
          { path: "members/a", data: { nickname: "a" }, revision: 0 },
        ],
      }),
    ).toBe(false);
  });

  it("rejects API failures without echoing server-provided sensitive details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            success: false,
            errors: [{ message: "private-token and private member data" }],
          },
          { status: 429 },
        ),
      ),
    );
    const client = new D1HttpClient("account", "database", "private-token");
    await expect(client.prepare("SELECT 1").all()).rejects.toThrow(
      /^D1 HTTP request failed \(429\)$/,
    );
  });

  it("rejects an incomplete batch response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ success: true, result: [] })),
    );
    const client = new D1HttpClient("account", "database", "token");
    await expect(client.prepare("SELECT 1").all()).rejects.toThrow(
      "incomplete batch",
    );
  });
});
