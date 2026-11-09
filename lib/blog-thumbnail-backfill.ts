/**
 * 登録済みブログのサムネイルを補完する。
 * - サムネイルが無い記事: 元記事の OGP 画像を取得して入れる
 * - サムネイルの URL が画像を返さなくなった記事: OGP 画像を取り直す。取れなければ消す
 *   (消すと一覧ではタイトル入りの既定表示になる)
 *
 * 一度きりの移行用。scripts/backfill-blog-thumbnails.ts から呼ぶ。
 */

import { getDb } from "@/lib/firebase";
import { fetchBlogMetadata } from "@/lib/blog-metadata";
import { FieldValue } from "firebase-admin/firestore";

const IMAGE_CHECK_TIMEOUT_MS = 5000;

export type ThumbnailAction =
  | { kind: "keep" }
  | { kind: "set"; thumbnailUrl: string; reason: "missing" | "broken" }
  | { kind: "clear" };

export interface ThumbnailPlanItem {
  id: string;
  url: string;
  current?: string;
  action: ThumbnailAction;
}

/**
 * URL が画像を返すかを確かめる。https 以外・通信失敗・画像以外の応答は false。
 * HEAD を受け付けないサーバーがあるので、HEAD が 405/501 なら GET で確かめる。
 */
export async function isImageReachable(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;

  const request = async (method: "HEAD" | "GET") => {
    const res = await fetchImpl(parsed, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(IMAGE_CHECK_TIMEOUT_MS),
    });
    if (method === "GET") await res.body?.cancel();
    return res;
  };

  try {
    let res = await request("HEAD");
    if (res.status === 405 || res.status === 501) res = await request("GET");
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    return type.toLowerCase().startsWith("image/");
  } catch {
    return false;
  }
}

/** 1 件の記事について、サムネイルをどうするかを決める */
export async function planThumbnail(
  blog: { url: string; thumbnailUrl?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ThumbnailAction> {
  const current = blog.thumbnailUrl || undefined;
  if (current && (await isImageReachable(current, fetchImpl))) {
    return { kind: "keep" };
  }

  const metadata = await fetchBlogMetadata(blog.url, fetchImpl);
  const candidate = metadata?.thumbnailUrl;
  if (
    candidate &&
    candidate !== current &&
    (await isImageReachable(candidate, fetchImpl))
  ) {
    return {
      kind: "set",
      thumbnailUrl: candidate,
      reason: current ? "broken" : "missing",
    };
  }

  return current ? { kind: "clear" } : { kind: "keep" };
}

/** 全記事の補完計画を作る。書き込みはしない */
export async function planThumbnailBackfill(
  fetchImpl: typeof fetch = fetch,
): Promise<ThumbnailPlanItem[]> {
  const snapshot = await getDb().collection("blogs").get();
  const items: ThumbnailPlanItem[] = [];
  // 外部サイトへの負荷を避けるため 1 件ずつ処理する（記事数は少ない）
  for (const doc of snapshot.docs) {
    const data = doc.data() as { url?: string; thumbnailUrl?: string };
    if (!data.url) continue;
    items.push({
      id: doc.id,
      url: data.url,
      current: data.thumbnailUrl || undefined,
      action: await planThumbnail(
        { url: data.url, thumbnailUrl: data.thumbnailUrl },
        fetchImpl,
      ),
    });
  }
  return items;
}

/** 計画を Firestore に反映する。戻り値は更新した件数 */
export async function applyThumbnailBackfill(
  items: ThumbnailPlanItem[],
): Promise<number> {
  const db = getDb();
  const batch = db.batch();
  let count = 0;
  for (const item of items) {
    const ref = db.collection("blogs").doc(item.id);
    if (item.action.kind === "set") {
      batch.update(ref, { thumbnailUrl: item.action.thumbnailUrl });
      count++;
    } else if (item.action.kind === "clear") {
      batch.update(ref, { thumbnailUrl: FieldValue.delete() });
      count++;
    }
  }
  if (count > 0) await batch.commit();
  return count;
}
