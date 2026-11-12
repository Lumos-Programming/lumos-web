/**
 * 記事URLから、媒体と記事情報の取得方法を決める。
 * 通信はしないので、クライアント (記事登録フォーム) からも使える。
 * 取得そのもの (サーバー側) は lib/blog-metadata.ts。
 */

import type { BlogPlatformPreset } from "@/types/blog";

export type BlogMetadataSource =
  | { kind: "ogp"; pageUrl: string }
  | { kind: "medium-rss"; feedUrl: string; postId: string };

const OGP_HOSTS = new Map<string, BlogPlatformPreset>([
  ["qiita.com", "Qiita"],
  ["zenn.dev", "Zenn"],
]);

function isOgpHost(hostname: string): boolean {
  return OGP_HOSTS.has(hostname);
}

function isMediumHost(hostname: string): boolean {
  return hostname === "medium.com" || hostname.endsWith(".medium.com");
}

export function isAllowedHost(hostname: string): boolean {
  return isOgpHost(hostname) || isMediumHost(hostname);
}

export function parseHttpsUrl(value: string): URL | null {
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
