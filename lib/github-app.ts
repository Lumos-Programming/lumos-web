import { createSign } from "node:crypto";

/**
 * Lumos の GitHub App として API を叩くためのトークンを用意する。
 * 個人の PAT を使わずに済むよう、App の秘密鍵で JWT を作り、
 * それと引き換えに installation token (1 時間有効) を発行する。
 *
 * 必要な環境変数: GITHUB_APP_ID / GITHUB_APP_INSTALLATION_ID / GITHUB_APP_PRIVATE_KEY
 */

const API_BASE = "https://api.github.com";
/** GitHub は JWT の有効期限を最大 10 分までしか受け付けない */
const JWT_TTL_SECONDS = 9 * 60;
/** サーバーとの時計ずれに備えて iat を過去にずらす (GitHub 推奨) */
const JWT_CLOCK_SKEW_SECONDS = 60;
/** 期限切れ間際のトークンは使わず取り直す */
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface GithubAppConfig {
  appId: string;
  installationId: string;
  privateKey: string;
}

function readConfig(): GithubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !installationId || !privateKey) return null;
  // .env では改行を \n と 1 行で書くことが多いので戻す
  return {
    appId,
    installationId,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

export function isGithubAppConfigured(): boolean {
  return readConfig() !== null;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/** App として認証するための RS256 JWT を作る */
export function createAppJwt(
  appId: string,
  privateKey: string,
  now: Date = new Date(),
): string {
  const iat = Math.floor(now.getTime() / 1000) - JWT_CLOCK_SKEW_SECONDS;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iat, exp: iat + JWT_TTL_SECONDS, iss: appId }),
  );
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(privateKey);
  return `${header}.${payload}.${base64url(signature)}`;
}

let cached: { token: string; expiresAt: number } | null = null;

/** テスト用。キャッシュ済みの installation token を捨てる */
export function clearInstallationTokenCache(): void {
  cached = null;
}

/**
 * installation token を返す。有効期限まで 5 分以上あればキャッシュを使い回す。
 * App が未設定なら例外。
 */
export async function getInstallationToken(
  now: Date = new Date(),
): Promise<string> {
  if (cached && cached.expiresAt - now.getTime() > TOKEN_REFRESH_MARGIN_MS) {
    return cached.token;
  }

  const config = readConfig();
  if (!config) throw new Error("GitHub App is not configured");

  const jwt = createAppJwt(config.appId, config.privateKey, now);
  const res = await fetch(
    `${API_BASE}/app/installations/${config.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "lumos-web",
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `GitHub installation token request responded ${res.status}`,
    );
  }

  const json = (await res.json()) as { token?: string; expires_at?: string };
  const expiresAt = json.expires_at ? Date.parse(json.expires_at) : NaN;
  if (!json.token || Number.isNaN(expiresAt)) {
    throw new Error("GitHub installation token response is malformed");
  }

  cached = { token: json.token, expiresAt };
  return json.token;
}
