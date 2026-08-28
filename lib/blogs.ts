import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";
import { BLOG_ERROR_CODES, BlogError, type Blog } from "@/types/blog";

export type BlogInput = Omit<Blog, "id" | "authorId" | "createdAt">;

function isValidBlogUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

function assertValidBlogInput(input: BlogInput): void {
  if (!isValidBlogUrl(input.url)) {
    throw new BlogError(BLOG_ERROR_CODES.INVALID_URL);
  }
  if (!input.title || input.title.trim() === "") {
    throw new BlogError(BLOG_ERROR_CODES.TITLE_REQUIRED);
  }
}

function toBlog(id: string, data: FirebaseFirestore.DocumentData): Blog {
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

function byPublishedAtDesc(a: Blog, b: Blog): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export async function listPublishedBlogs(): Promise<Blog[]> {
  const db = getDb();
  const snap = await db
    .collection("blogs")
    .orderBy("publishedAt", "desc")
    .get();
  return snap.docs.map((doc) => toBlog(doc.id, doc.data()));
}

export async function listBlogsByAuthor(authorId: string): Promise<Blog[]> {
  const db = getDb();
  const snap = await db
    .collection("blogs")
    .where("authorId", "==", authorId)
    .get();
  return snap.docs
    .map((doc) => toBlog(doc.id, doc.data()))
    .sort(byPublishedAtDesc);
}

export async function createBlog(
  authorId: string,
  input: BlogInput,
): Promise<Blog> {
  assertValidBlogInput(input);

  const db = getDb();
  const ref = db.collection("blogs").doc();
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
  return toBlog(ref.id, data);
}

export async function updateBlog(
  id: string,
  authorId: string,
  input: BlogInput,
): Promise<void> {
  assertValidBlogInput(input);

  const db = getDb();
  const ref = db.collection("blogs").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new BlogError(BLOG_ERROR_CODES.NOT_FOUND);
  if (snap.data()?.authorId !== authorId)
    throw new BlogError(BLOG_ERROR_CODES.FORBIDDEN);

  await ref.update({
    url: input.url,
    title: input.title,
    publishedAt: input.publishedAt,
    description: input.description || FieldValue.delete(),
    thumbnailUrl: input.thumbnailUrl || FieldValue.delete(),
    platform: input.platform || FieldValue.delete(),
  });
}

export async function deleteBlog(id: string, authorId: string): Promise<void> {
  const db = getDb();
  const ref = db.collection("blogs").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  if (snap.data()?.authorId !== authorId)
    throw new BlogError(BLOG_ERROR_CODES.FORBIDDEN);

  await ref.delete();
}
