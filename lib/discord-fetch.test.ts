import { describe, expect, it, vi } from "vitest";
import {
  DISCORD_MAX_RETRIES,
  discordFetch,
  retryAfterMs,
} from "./discord-fetch";

function rateLimited(body: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: 429,
    headers,
  });
}

const ok = () => new Response("{}", { status: 200 });

describe("retryAfterMs", () => {
  it("本文の retry_after（秒・小数）を切り上げてミリ秒にする", async () => {
    expect(await retryAfterMs(rateLimited({ retry_after: 1.2345 }))).toBe(1235);
  });

  it("本文に無ければ Retry-After ヘッダーを使う", async () => {
    expect(
      await retryAfterMs(rateLimited("not json", { "retry-after": "2" })),
    ).toBe(2000);
  });

  it("どちらも無ければ 1 秒", async () => {
    expect(await retryAfterMs(rateLimited("x"))).toBe(1000);
  });

  it("負の値や数値でない値は使わない", async () => {
    expect(
      await retryAfterMs(
        rateLimited({ retry_after: -1 }, { "retry-after": "abc" }),
      ),
    ).toBe(1000);
  });

  it("本文を読んでも元の応答の本文は残る", async () => {
    const res = rateLimited({
      retry_after: 1,
      message: "You are being rate limited.",
    });
    await retryAfterMs(res);
    expect((await res.json()).message).toBe("You are being rate limited.");
  });
});

describe("discordFetch", () => {
  it("429 なら待ってから同じリクエストを再試行する", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(rateLimited({ retry_after: 0.5 }))
      .mockResolvedValueOnce(ok());
    const sleep = vi.fn().mockResolvedValue(undefined);
    const init = { method: "PUT" };
    const res = await discordFetch("https://discord.com/api/x", init, {
      fetchImpl,
      sleep,
    });
    expect(res.status).toBe(200);
    expect(sleep).toHaveBeenCalledWith(500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]).toEqual([
      "https://discord.com/api/x",
      init,
    ]);
  });

  it("429 以外のエラーは再試行しない", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 500 }));
    const sleep = vi.fn();
    const res = await discordFetch("u", undefined, { fetchImpl, sleep });
    expect(res.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it(`再試行は ${DISCORD_MAX_RETRIES} 回までで、最後の 429 をそのまま返す`, async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi
      .fn()
      .mockImplementation(async () => rateLimited({ retry_after: 0 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const res = await discordFetch("u", undefined, { fetchImpl, sleep });
    expect(res.status).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(DISCORD_MAX_RETRIES + 1);
    expect(sleep).toHaveBeenCalledTimes(DISCORD_MAX_RETRIES);
    warn.mockRestore();
  });

  it("待ち時間が長すぎるときは待たずに 429 を返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(rateLimited({ retry_after: 600 }));
    const sleep = vi.fn();
    const res = await discordFetch("u", undefined, { fetchImpl, sleep });
    expect(res.status).toBe(429);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("deps を渡さなければ globalThis.fetch を使う", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok());
    expect((await discordFetch("u")).status).toBe(200);
    spy.mockRestore();
  });
});
