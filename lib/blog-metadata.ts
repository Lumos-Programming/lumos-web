/**
 * 記事URLから、登録フォームに入れる情報 (サムネイル画像URL・タイトル・説明・公開日) を自動で取得する。
 *
 * 対応しているのは Qiita / Zenn / Medium だけで、それ以外は null を返して手動入力にしてもらう。
 * - Qiita / Zenn: 記事ページの OGP (og:image / og:title / og:description) と、
 *   schema.org の構造化データ (JSON-LD) の datePublished
 * - Medium: 記事ページはボット対策で 403 になるため、公式 RSS から該当記事を探す。
 *   RSS に載るのは直近 10 件程度なので、古い記事は取れない (null)。
 * 媒体ごとに出している項目が違うので、取れなかった項目は null のまま返す。
 *
 * サーバーから外部へリクエストするので、取得先は下の許可ホストに限る (SSRF 対策)。
 * リダイレクトも自前で追い、行き先が許可ホストでなければそこで打ち切る。
 */

import type { BlogPlatformPreset } from "@/types/blog";

export interface BlogMetadata {
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  /** YYYY-MM-DD (日本時間) */
  publishedAt: string | null;
}

export type BlogMetadataSource =
  | { kind: "ogp"; pageUrl: string }
  | { kind: "medium-rss"; feedUrl: string; postId: string };

const OGP_HOSTS = new Map<string, BlogPlatformPreset>([
  ["qiita.com", "Qiita"],
  ["zenn.dev", "Zenn"],
]);

const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;
/** 記事ページ・RSS とも数百 KB 程度。これを超えたら読むのをやめる */
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const USER_AGENT =
  "LumosWebBot/1.0 (+https://github.com/Lumos-Programming/lumos-web)";

function isOgpHost(hostname: string): boolean {
  return OGP_HOSTS.has(hostname);
}

function isMediumHost(hostname: string): boolean {
  return hostname === "medium.com" || hostname.endsWith(".medium.com");
}

function isAllowedHost(hostname: string): boolean {
  return isOgpHost(hostname) || isMediumHost(hostname);
}

function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** 記事URLのドメインから媒体を決める。対応外なら null (フォームでは「その他」のまま) */
export function detectBlogPlatform(
  articleUrl: string,
): BlogPlatformPreset | null {
  const url = parseHttpsUrl(articleUrl);
  if (!url) return null;
  if (isMediumHost(url.hostname)) return "Medium";
  return OGP_HOSTS.get(url.hostname) ?? null;
}

/**
 * Medium の記事 ID を取り出す。記事URLは `.../タイトル-<16進のID>` か `/p/<ID>` の形。
 * RSS の guid は `https://medium.com/p/<ID>` なので、これで記事を突き合わせる。
 */
function extractMediumPostId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "p" && segments[1]) {
    return /^[0-9a-f]{8,}$/.test(segments[1]) ? segments[1] : null;
  }
  const last = segments[segments.length - 1] ?? "";
  return last.match(/-([0-9a-f]{8,})$/)?.[1] ?? null;
}

/**
 * Medium の RSS の URL を決める。
 * - `medium.com/@user/...` → `medium.com/feed/@user`
 * - `medium.com/<publication>/...` → `medium.com/feed/<publication>`
 * - `user.medium.com/...` → `user.medium.com/feed`
 */
function toMediumFeedUrl(url: URL): string | null {
  if (url.hostname !== "medium.com") {
    return `https://${url.hostname}/feed`;
  }
  const first = url.pathname.split("/").filter(Boolean)[0];
  // `/p/<ID>` だけでは書いた人も媒体も分からない
  if (!first || first === "p") return null;
  return `https://medium.com/feed/${first}`;
}

/** 記事URLから取得方法を決める。対応していない媒体・不正なURLは null */
export function resolveMetadataSource(
  articleUrl: string,
): BlogMetadataSource | null {
  const url = parseHttpsUrl(articleUrl);
  if (!url) return null;

  if (isOgpHost(url.hostname)) {
    return { kind: "ogp", pageUrl: url.toString() };
  }
  if (isMediumHost(url.hostname)) {
    const postId = extractMediumPostId(url);
    const feedUrl = toMediumFeedUrl(url);
    if (!postId || !feedUrl) return null;
    return { kind: "medium-rss", feedUrl, postId };
  }
  return null;
}

/** 自動取得に対応している記事URLか。フォームで取得を試すかどうかの判定に使う */
export function supportsMetadataAutofill(articleUrl: string): boolean {
  return resolveMetadataSource(articleUrl) !== null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** 前後の空白を落とし、空になったら null */
function toText(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const text = decodeHtmlEntities(raw).trim();
  return text === "" ? null : text;
}

/** 取り出した画像URLが http(s) の絶対URLのときだけ採用する */
function toImageUrl(raw: string | undefined): string | null {
  const decoded = toText(raw);
  if (!decoded) return null;
  try {
    const url = new URL(decoded);
    return url.protocol === "https:" || url.protocol === "http:"
      ? decoded
      : null;
  } catch {
    return null;
  }
}

const JST_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 日時の文字列を日本時間の YYYY-MM-DD にする。読めなければ null。
 * en-CA の書式が YYYY-MM-DD なのでそれを使う。
 */
export function toJstDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const date = new Date(raw.trim());
  return Number.isNaN(date.getTime()) ? null : JST_DATE_FORMAT.format(date);
}

function getAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"),
  );
  return match ? (match[1] ?? match[2]) : undefined;
}

/** meta タグの content を property / name ごとに、出てきた順に集める */
function collectMetaContents(html: string): Map<string, string[]> {
  const contents = new Map<string, string[]>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (
      getAttribute(tag, "property") ?? getAttribute(tag, "name")
    )?.toLowerCase();
    const content = getAttribute(tag, "content");
    if (!key || content === undefined) continue;
    contents.set(key, [...(contents.get(key) ?? []), content]);
  }
  return contents;
}

/** JSON-LD (schema.org の構造化データ) の datePublished を探す */
function extractJsonLdDatePublished(html: string): string | undefined {
  const scripts = html.match(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  );
  for (const script of scripts ?? []) {
    const value = script.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1];
    if (value) return value;
  }
  return undefined;
}

/**
 * og:title から媒体名の接尾辞 (Qiita の「 - Qiita」など) を落とす。
 * 接尾辞は og:site_name と一致するときだけ落とし、タイトル本文の「 - 」は残す。
 */
function stripSiteNameSuffix(title: string, siteName: string | null): string {
  if (!siteName) return title;
  const suffix = ` - ${siteName}`;
  return title.endsWith(suffix) && title.length > suffix.length
    ? title.slice(0, -suffix.length)
    : title;
}

/** 記事ページの HTML から、OGP と構造化データで取れる項目を取り出す */
export function extractOgpMetadata(html: string): BlogMetadata {
  const meta = collectMetaContents(html);
  const first = (key: string) => meta.get(key)?.[0];

  const thumbnailUrl =
    (meta.get("og:image") ?? []).map(toImageUrl).find((url) => url !== null) ??
    null;
  const rawTitle = toText(first("og:title"));

  return {
    thumbnailUrl,
    title: rawTitle
      ? stripSiteNameSuffix(rawTitle, toText(first("og:site_name")))
      : null,
    description: toText(first("og:description")),
    publishedAt: toJstDate(
      extractJsonLdDatePublished(html) ?? first("article:published_time"),
    ),
  };
}

/** RSS の要素の中身を取り出す。CDATA で包まれていれば外す */
function getRssElementText(item: string, name: string): string | undefined {
  const raw = item.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`),
  )?.[1];
  if (raw === undefined) return undefined;
  const cdata = raw.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return cdata ? cdata[1] : raw;
}

/**
 * Medium の RSS から postId の記事を探し、タイトル・公開日・本文の最初の画像を取り出す。
 * 本文末尾には閲覧計測用の 1px 画像 (`medium.com/_/stat`) が入っているので除く。
 * RSS に説明文は無いので description は常に null。記事が見つからなければ null。
 */
export function extractMediumRssMetadata(
  rss: string,
  postId: string,
): BlogMetadata | null {
  for (const item of rss.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    if (
      getRssElementText(item, "guid")?.trim() !==
      `https://medium.com/p/${postId}`
    ) {
      continue;
    }
    const thumbnailUrl =
      (item.match(/<img\b[^>]*>/gi) ?? [])
        .map((tag) => toImageUrl(getAttribute(tag, "src")))
        .find((url) => url !== null && !url.includes("medium.com/_/stat")) ??
      null;
    return {
      thumbnailUrl,
      title: toText(getRssElementText(item, "title")),
      description: null,
      publishedAt: toJstDate(getRssElementText(item, "pubDate")),
    };
  }
  return null;
}

/** 本文を上限まで読む。上限を超えたら null */
async function readBodyWithLimit(res: Response): Promise<string | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/**
 * 許可ホストの URL だけを取得する。リダイレクトは 1 回ずつ行き先を確かめて追う。
 * 取得できなければ null (呼び出し側は「自動取得できなかった」として扱う)。
 */
async function fetchAllowedText(
  startUrl: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = parseHttpsUrl(current);
    if (!url || !isAllowedHost(url.hostname)) return null;

    const res = await fetchImpl(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      current = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) return null;
    return readBodyWithLimit(res);
  }
  return null;
}

/**
 * 記事URLからフォームに入れる情報を取得する。
 * 対応外の媒体・通信失敗・記事が見つからないときは、例外にせず null を返す。
 */
export async function fetchBlogMetadata(
  articleUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BlogMetadata | null> {
  const source = resolveMetadataSource(articleUrl);
  if (!source) return null;

  try {
    if (source.kind === "ogp") {
      const html = await fetchAllowedText(source.pageUrl, fetchImpl);
      return html ? extractOgpMetadata(html) : null;
    }
    const rss = await fetchAllowedText(source.feedUrl, fetchImpl);
    return rss ? extractMediumRssMetadata(rss, source.postId) : null;
  } catch (error) {
    console.error("Failed to fetch blog metadata:", error);
    return null;
  }
}
