/**
 * Discord API 用の fetch。レートリミット（429）で失敗したら、
 * Discord が返す待ち時間だけ待って再試行する（#295）。
 * https://discord.com/developers/docs/topics/rate-limits
 */

/** 再試行の回数（初回を含めず） */
export const DISCORD_MAX_RETRIES = 3;
/** 1 回に待つ上限。これより長く待てと言われたら諦めて 429 を返す（Cloud Run のタイムアウト対策） */
export const DISCORD_MAX_RETRY_WAIT_MS = 30_000;
/** 待ち時間が読み取れないときの既定値 */
const DEFAULT_RETRY_WAIT_MS = 1_000;

/**
 * 429 応答から待ち時間（ミリ秒）を読む。
 * 本文の retry_after（秒、小数あり）→ Retry-After ヘッダー（秒）→ 既定値 の順。
 */
export async function retryAfterMs(response: Response): Promise<number> {
  try {
    const body = (await response.clone().json()) as { retry_after?: unknown };
    if (typeof body.retry_after === "number" && body.retry_after >= 0) {
      return Math.ceil(body.retry_after * 1000);
    }
  } catch {
    // 本文が JSON でなければヘッダーを見る
  }
  const raw = response.headers.get("retry-after");
  const header = raw === null || raw.trim() === "" ? NaN : Number(raw);
  if (Number.isFinite(header) && header >= 0) return Math.ceil(header * 1000);
  return DEFAULT_RETRY_WAIT_MS;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function discordFetch(
  input: string | URL,
  init?: RequestInit,
  deps: {
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
  } = {},
): Promise<Response> {
  // テストで globalThis.fetch を差し替えられるよう、呼び出し時に参照する
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const sleep = deps.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    const response = await fetchImpl(input, init);
    if (response.status !== 429 || attempt >= DISCORD_MAX_RETRIES) {
      return response;
    }
    const wait = await retryAfterMs(response);
    if (wait > DISCORD_MAX_RETRY_WAIT_MS) return response;
    console.warn(
      `Discord API rate limited; retrying in ${wait}ms (${attempt + 1}/${DISCORD_MAX_RETRIES})`,
    );
    await sleep(wait);
  }
}
