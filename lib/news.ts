import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";
import {
  NEWS_ERROR_CODES,
  NewsError,
  byPublishedAtDesc,
  isNewsCategory,
  type NewsArticle,
  type NewsStatus,
} from "@/types/news";

const COLLECTION = "news";

/** 記事の中身。公開状態と執筆者は本文の更新では触らないので含めない */
export type NewsInput = Pick<
  NewsArticle,
  "date" | "title" | "summary" | "body" | "image" | "category"
>;

/**
 * 画像は GCS の公開 URL か、public/assets 配下の相対パスを許す。
 * 既存のお知らせが "/assets/pizza.png" 形式なので相対パスも通す必要がある。
 */
function isValidImagePath(image: string): boolean {
  return /^(https?:\/\/|\/)/.test(image);
}

/**
 * リクエストボディの形。中身の妥当性は assertValidNewsInput が見るので、
 * ここでは「文字列であること」だけを保証する。
 */
const newsInputSchema = z.object({
  date: z.string(),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  image: z.string(),
  category: z.string(),
});

function assertValidNewsInput(input: NewsInput): void {
  if (input.title.trim() === "") {
    throw new NewsError(NEWS_ERROR_CODES.TITLE_REQUIRED);
  }
  if (input.body.trim() === "") {
    throw new NewsError(NEWS_ERROR_CODES.BODY_REQUIRED);
  }
  if (input.date.trim() === "") {
    throw new NewsError(NEWS_ERROR_CODES.DATE_REQUIRED);
  }
  if (!isNewsCategory(input.category)) {
    throw new NewsError(NEWS_ERROR_CODES.INVALID_CATEGORY);
  }
  if (input.image !== "" && !isValidImagePath(input.image)) {
    throw new NewsError(NEWS_ERROR_CODES.INVALID_IMAGE_URL);
  }
}

/** 未検証のリクエストボディを NewsInput にする。不正なら NewsError を投げる */
export function parseNewsInput(body: unknown): NewsInput {
  const parsed = newsInputSchema.safeParse(body);
  if (!parsed.success) throw new NewsError(NEWS_ERROR_CODES.INVALID_INPUT);

  const input = {
    date: parsed.data.date,
    title: parsed.data.title,
    summary: parsed.data.summary,
    body: parsed.data.body,
    image: parsed.data.image,
    category: parsed.data.category,
  } as NewsInput;
  assertValidNewsInput(input);
  return input;
}

function toIso(value?: FirebaseFirestore.Timestamp): string | null {
  return value ? value.toDate().toISOString() : null;
}

function toNewsArticle(
  id: string,
  data: FirebaseFirestore.DocumentData,
): NewsArticle {
  return {
    id,
    date: data.date,
    title: data.title,
    summary: data.summary,
    body: data.body,
    image: data.image,
    category: data.category,
    status: data.status,
    publishedAt: toIso(data.publishedAt),
    authorId: data.authorId,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/**
 * 公開済みのお知らせを新しい順に返す (公開ページ用)。
 * status での絞り込みと publishedAt での並べ替えを同時にやると Firestore の
 * 複合インデックスが要るので、blogs と同じく並べ替えはメモリ側で行う。
 */
export async function listPublishedNews(): Promise<NewsArticle[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTION)
    .where("status", "==", "published")
    .get();

  return snap.docs
    .map((doc) => toNewsArticle(doc.id, doc.data()))
    .sort(byPublishedAtDesc);
}

/** 下書きを含む全件を新しい順に返す (管理 UI 用) */
export async function listAllNews(): Promise<NewsArticle[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTION).get();

  return snap.docs
    .map((doc) => toNewsArticle(doc.id, doc.data()))
    .sort(byPublishedAtDesc);
}

/** 下書きを含めて 1 件返す (管理 UI 用) */
export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return toNewsArticle(snap.id, snap.data()!);
}

/** 公開済みのものだけ 1 件返す。下書きは null (公開ページ用) */
export async function getPublishedNewsArticle(
  id: string,
): Promise<NewsArticle | null> {
  const article = await getNewsArticle(id);
  if (!article || article.status !== "published") return null;
  return article;
}

/**
 * 下書きとして作成し、ドキュメント ID を返す。
 * `id` を渡すと明示的な ID で作る。既存のお知らせを移行するとき
 * /news/9 のような既存 URL を保つために使う。
 */
export async function createNews(
  input: NewsInput,
  authorId: string,
  id?: string,
): Promise<string> {
  const db = getDb();
  const ref = id
    ? db.collection(COLLECTION).doc(id)
    : db.collection(COLLECTION).doc();

  await ref.set({
    ...input,
    status: "draft" satisfies NewsStatus,
    authorId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ref.id;
}

/** 中身を更新する。公開状態は変えない */
export async function updateNews(id: string, input: NewsInput): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) {
    throw new NewsError(NEWS_ERROR_CODES.NOT_FOUND);
  }

  await ref.update({
    ...input,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * 公開する。publishedAt は初回公開時だけ設定し、下書きに戻して再公開しても
 * 一覧での位置が変わらないようにする。`publishedAt` を渡すと明示的に上書きできる
 * (既存記事の移行で当時の日付を入れるために使う)。
 */
export async function publishNews(
  id: string,
  publishedAt?: Date,
): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new NewsError(NEWS_ERROR_CODES.NOT_FOUND);

  const updates: Record<string, unknown> = {
    status: "published" satisfies NewsStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (publishedAt) {
    updates.publishedAt = Timestamp.fromDate(publishedAt);
  } else if (!snap.data()!.publishedAt) {
    updates.publishedAt = FieldValue.serverTimestamp();
  }

  await ref.update(updates);
}

/** 下書きに戻す。publishedAt は再公開時のために残す */
export async function unpublishNews(id: string): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) {
    throw new NewsError(NEWS_ERROR_CODES.NOT_FOUND);
  }

  await ref.update({
    status: "draft" satisfies NewsStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteNews(id: string): Promise<void> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  if (!(await ref.get()).exists) {
    throw new NewsError(NEWS_ERROR_CODES.NOT_FOUND);
  }
  await ref.delete();
}

/**
 * 公開ページ用の一覧。Firestore にまだ 1 件も無い間は移行前のお知らせを返す。
 *
 * 移行が終わるまで公開ページが空にならないようにするための繋ぎで、
 * scripts/migrate-news.ts を本番で流したあとは lib/news-legacy.ts ごと消せる。
 */
export async function listPublishedNewsWithFallback(): Promise<NewsArticle[]> {
  const articles = await listPublishedNews();
  if (articles.length > 0) return articles;

  const { LEGACY_NEWS_ARTICLES } = await import("@/lib/news-legacy");
  return [...LEGACY_NEWS_ARTICLES].sort(byPublishedAtDesc);
}

/** 公開ページ用の 1 件取得。listPublishedNewsWithFallback と同じ繋ぎ */
export async function getPublishedNewsArticleWithFallback(
  id: string,
): Promise<NewsArticle | null> {
  const article = await getPublishedNewsArticle(id);
  if (article) return article;

  if ((await listPublishedNews()).length > 0) return null;

  const { LEGACY_NEWS_ARTICLES } = await import("@/lib/news-legacy");
  return LEGACY_NEWS_ARTICLES.find((a) => a.id === id) ?? null;
}
