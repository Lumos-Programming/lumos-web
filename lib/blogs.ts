import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getDb } from "@/lib/firebase";
import {
  getMember,
  isMemberOptedOut,
  isMemberPubliclyVisible,
  profileToMember,
} from "@/lib/members";
import {
  BLOG_ERROR_CODES,
  BLOG_PUBLISHED_AT_PATTERN,
  BlogError,
  byPublishedAtDesc,
  type Blog,
} from "@/types/blog";

export type BlogInput = Omit<Blog, "id" | "authorId" | "createdAt">;

/** 公開一覧に出す 1 件。著者名は members の公開設定を通した結果だけを持つ */
export interface PublicBlog extends Blog {
  authorName: string;
}

/** 名前を公開していない著者の表示名 */
export const PUBLIC_AUTHOR_FALLBACK_NAME = "Lumosメンバー";

function isValidBlogUrl(url: string): boolean {
  return /^https?:\/\//.test(url);
}

/**
 * リクエストボディの形。中身の妥当性は assertValidBlogInput が見るので、
 * ここでは「文字列であること」だけを保証する。
 * 型が違う値をそのまま Firestore に入れると、あとから一覧のソートが落ちて
 * 記事管理ページごと開けなくなるため、書き込み経路の入口で必ず通す。
 */
const blogInputSchema = z.object({
  url: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  platform: z.string().optional(),
});

function assertValidBlogInput(input: BlogInput): void {
  if (!isValidBlogUrl(input.url)) {
    throw new BlogError(BLOG_ERROR_CODES.INVALID_URL);
  }
  if (!input.title || input.title.trim() === "") {
    throw new BlogError(BLOG_ERROR_CODES.TITLE_REQUIRED);
  }
  if (!BLOG_PUBLISHED_AT_PATTERN.test(input.publishedAt)) {
    throw new BlogError(BLOG_ERROR_CODES.INVALID_PUBLISHED_AT);
  }
  if (input.thumbnailUrl && !isValidBlogUrl(input.thumbnailUrl)) {
    throw new BlogError(BLOG_ERROR_CODES.INVALID_THUMBNAIL_URL);
  }
}

/** 未検証のリクエストボディを BlogInput にする。不正なら BlogError を投げる */
export function parseBlogInput(body: unknown): BlogInput {
  const parsed = blogInputSchema.safeParse(body);
  if (!parsed.success) throw new BlogError(BLOG_ERROR_CODES.INVALID_INPUT);

  const input: BlogInput = {
    url: parsed.data.url,
    title: parsed.data.title,
    publishedAt: parsed.data.publishedAt,
    // 空文字は「未入力」として扱い、Firestore には持たせない
    description: parsed.data.description || undefined,
    thumbnailUrl: parsed.data.thumbnailUrl || undefined,
    platform: parsed.data.platform || undefined,
  };
  assertValidBlogInput(input);
  return input;
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

/**
 * blogs コレクション全体を公開日の降順で返す。下書き/公開の状態は持っていない。
 * 公開ページに出すものは listPublicBlogs を使う (退会済みの著者を落とすため)。
 */
export async function listAllBlogs(): Promise<Blog[]> {
  const db = getDb();
  const snap = await db
    .collection("blogs")
    .orderBy("publishedAt", "desc")
    .get();
  return snap.docs.map((doc) => toBlog(doc.id, doc.data()));
}

/**
 * 公開ページ (/blogs) 用の一覧。members の公開設定を必ず通す。
 * - 退会済み (optedOut) の著者の記事は出さない。退会は再加入で戻せるフラグなので、
 *   記事は消さずに公開一覧から隠すだけにしている
 * - 名前を公開していない著者は PUBLIC_AUTHOR_FALLBACK_NAME にする。
 *   表示名の作り方そのものは profileToMember (公開ページ共通) に任せる
 */
export async function listPublicBlogs(): Promise<PublicBlog[]> {
  const blogs = await listAllBlogs();
  const authorIds = [...new Set(blogs.map((blog) => blog.authorId))];
  const members = new Map(
    await Promise.all(
      authorIds.map(async (id) => [id, await getMember(id)] as const),
    ),
  );

  return blogs.flatMap((blog) => {
    const member = members.get(blog.authorId) ?? null;
    if (isMemberOptedOut(member)) return [];
    const authorName = isMemberPubliclyVisible(member)
      ? profileToMember(blog.authorId, member).name ||
        PUBLIC_AUTHOR_FALLBACK_NAME
      : PUBLIC_AUTHOR_FALLBACK_NAME;
    return [{ ...blog, authorName }];
  });
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
  if (!snap.exists) throw new BlogError(BLOG_ERROR_CODES.NOT_FOUND);
  if (snap.data()?.authorId !== authorId)
    throw new BlogError(BLOG_ERROR_CODES.FORBIDDEN);

  await ref.delete();
}
