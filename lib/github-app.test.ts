import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import {
  clearInstallationTokenCache,
  createAppJwt,
  getInstallationToken,
  isGithubAppConfigured,
} from "./github-app";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

function decodeJwt(jwt: string) {
  const [header, payload, signature] = jwt.split(".");
  const verified = createVerify("RSA-SHA256")
    .update(`${header}.${payload}`)
    .verify(publicKey, Buffer.from(signature, "base64url"));
  return {
    header: JSON.parse(Buffer.from(header, "base64url").toString()),
    payload: JSON.parse(Buffer.from(payload, "base64url").toString()),
    verified,
  };
}

function tokenResponse(token: string, expiresAt: string): Response {
  return new Response(JSON.stringify({ token, expires_at: expiresAt }), {
    status: 201,
  });
}

describe("github-app", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;
  const now = new Date("2026-10-17T00:00:00Z");

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubEnv("GITHUB_APP_ID", "12345");
    vi.stubEnv("GITHUB_APP_INSTALLATION_ID", "678");
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey);
    clearInstallationTokenCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe("isGithubAppConfigured", () => {
    it("requires all three variables", () => {
      expect(isGithubAppConfigured()).toBe(true);
      for (const name of [
        "GITHUB_APP_ID",
        "GITHUB_APP_INSTALLATION_ID",
        "GITHUB_APP_PRIVATE_KEY",
      ]) {
        vi.stubEnv(name, "");
        expect(isGithubAppConfigured()).toBe(false);
        vi.stubEnv(name, "x");
      }
    });
  });

  describe("createAppJwt", () => {
    it("signs an RS256 JWT backdated for clock skew and under 10 minutes", () => {
      const { header, payload, verified } = decodeJwt(
        createAppJwt("12345", privateKey, now),
      );
      const nowSec = now.getTime() / 1000;
      expect(verified).toBe(true);
      expect(header).toEqual({ alg: "RS256", typ: "JWT" });
      expect(payload.iss).toBe("12345");
      expect(payload.iat).toBe(nowSec - 60);
      expect(payload.exp - payload.iat).toBe(540);
      // GitHub は「現在から 10 分以内」の exp しか受け付けない
      expect(payload.exp - nowSec).toBeLessThanOrEqual(600);
    });

    it("rejects an invalid private key", () => {
      expect(() => createAppJwt("1", "not a key", now)).toThrow();
    });
  });

  describe("getInstallationToken", () => {
    it("exchanges the App JWT for an installation token", async () => {
      fetchMock.mockResolvedValueOnce(
        tokenResponse("ghs_abc", "2026-10-17T01:00:00Z"),
      );

      expect(await getInstallationToken(now)).toBe("ghs_abc");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        "https://api.github.com/app/installations/678/access_tokens",
      );
      expect(init.method).toBe("POST");
      const jwt = init.headers.Authorization.replace(/^Bearer /, "");
      expect(decodeJwt(jwt).verified).toBe(true);
    });

    it("accepts a private key written on one line with \\n escapes", async () => {
      vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey.replace(/\n/g, "\\n"));
      fetchMock.mockResolvedValueOnce(
        tokenResponse("ghs_abc", "2026-10-17T01:00:00Z"),
      );

      await getInstallationToken(now);
      const jwt = fetchMock.mock.calls[0][1].headers.Authorization.slice(7);
      expect(decodeJwt(jwt).verified).toBe(true);
    });

    it("reuses the token until 5 minutes before it expires", async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse("first", "2026-10-17T01:00:00Z"))
        .mockResolvedValueOnce(tokenResponse("second", "2026-10-17T02:00:00Z"));

      expect(await getInstallationToken(now)).toBe("first");
      // 残り 5 分 1 秒 → キャッシュを使う
      expect(await getInstallationToken(new Date("2026-10-17T00:54:59Z"))).toBe(
        "first",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // 残りちょうど 5 分 → 取り直す
      expect(await getInstallationToken(new Date("2026-10-17T00:55:00Z"))).toBe(
        "second",
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws without calling GitHub when the App is not configured", async () => {
      vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
      await expect(getInstallationToken(now)).rejects.toThrow("not configured");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws on HTTP errors and does not cache them", async () => {
      fetchMock
        .mockResolvedValueOnce(new Response("", { status: 401 }))
        .mockResolvedValueOnce(tokenResponse("ok", "2026-10-17T01:00:00Z"));

      await expect(getInstallationToken(now)).rejects.toThrow("401");
      expect(await getInstallationToken(now)).toBe("ok");
    });

    it("throws on a malformed response", async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "x", expires_at: "nope" }), {
          status: 201,
        }),
      );
      await expect(getInstallationToken(now)).rejects.toThrow("malformed");

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ expires_at: "2026-10-17T01:00:00Z" }), {
          status: 201,
        }),
      );
      await expect(getInstallationToken(now)).rejects.toThrow("malformed");
    });
  });
});
