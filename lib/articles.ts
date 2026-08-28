import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";
import type { Article } from "@/types/article";

export type ArticleInput = Omit<Article, "id" | "authorId" | "createdAt">;

function isValidArticleUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

function assertValidArticleInput(input: ArticleInput): void {
  if (!isValidArticleUrl(input.url)) {
    throw new Error("Invalid URL");
  }
  if (!input.title || input.title.trim() === "") {
    throw new Error("Title is required");
  }
}

function toArticle(id: string, data: FirebaseFirestore.DocumentData): Article {
  return {
    id,
    authorId: data.authorId,
    url: data.url,
    title: data.title,
    description: data.description,
    thumbnailUrl: data.thumbnailUrl,
    publishedAt: data.publishedAt,
    platform: data.platform,
    createdAt: data.createdAt,
  };
}

function byPublishedAtDesc(a: Article, b: Article): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export async function listPublishedArticles(): Promise<Article[]> {
  const db = getDb();
  const snap = await db
    .collection("articles")
    .orderBy("publishedAt", "desc")
    .get();
  return snap.docs.map((doc) => toArticle(doc.id, doc.data()));
}

export async function listArticlesByAuthor(
  authorId: string,
): Promise<Article[]> {
  const db = getDb();
  const snap = await db
    .collection("articles")
    .where("authorId", "==", authorId)
    .get();
  return snap.docs
    .map((doc) => toArticle(doc.id, doc.data()))
    .sort(byPublishedAtDesc);
}

export async function createArticle(
  authorId: string,
  input: ArticleInput,
): Promise<Article> {
  assertValidArticleInput(input);

  const db = getDb();
  const ref = db.collection("articles").doc();
  const data: FirebaseFirestore.DocumentData = {
    authorId,
    url: input.url,
    title: input.title,
    publishedAt: input.publishedAt,
    createdAt: Date.now(),
  };
  if (input.description) data.description = input.description;
  if (input.thumbnailUrl) data.thumbnailUrl = input.thumbnailUrl;
  if (input.platform) data.platform = input.platform;

  await ref.set(data);
  return toArticle(ref.id, data);
}

export async function updateArticle(
  id: string,
  authorId: string,
  input: ArticleInput,
): Promise<void> {
  assertValidArticleInput(input);

  const db = getDb();
  const ref = db.collection("articles").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Article not found");
  if (snap.data()?.authorId !== authorId) throw new Error("Unauthorized");

  await ref.update({
    url: input.url,
    title: input.title,
    publishedAt: input.publishedAt,
    description: input.description || FieldValue.delete(),
    thumbnailUrl: input.thumbnailUrl || FieldValue.delete(),
    platform: input.platform || FieldValue.delete(),
  });
}

export async function deleteArticle(
  id: string,
  authorId: string,
): Promise<void> {
  const db = getDb();
  const ref = db.collection("articles").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  if (snap.data()?.authorId !== authorId) throw new Error("Unauthorized");

  await ref.delete();
}
