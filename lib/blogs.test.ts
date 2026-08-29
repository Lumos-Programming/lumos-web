import { describe, it, expect, beforeEach } from "vitest";
import { BLOG_ERROR_CODES, BlogError } from "@/types/blog";
import * as firebaseAdmin from "firebase-admin";
import type { MemberDocument } from "@/lib/members";
import type { VisibilityLevel } from "@/types/profile";
import {
  listAllBlogs,
  listPublicBlogs,
  listBlogsByAuthor,
  createBlog,
  updateBlog,
  deleteBlog,
  parseBlogInput,
  PUBLIC_AUTHOR_FALLBACK_NAME,
} from "./blogs";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

/** 例外が期待した BlogError かどうかをコードで確かめる */
async function expectBlogError(
  promise: Promise<unknown>,
  code: (typeof BLOG_ERROR_CODES)[keyof typeof BLOG_ERROR_CODES],
) {
  await expect(promise).rejects.toBeInstanceOf(BlogError);
  await promise.catch((e) => expect((e as BlogError).code).toBe(code));
}

const VISIBILITY_KEYS = [
  "studentId",
  "nickname",
  "lastName",
  "firstName",
  "faculty",
  "currentOrg",
  "birthDate",
  "gender",
  "bio",
  "github",
  "x",
  "linkedin",
  "line",
  "discord",
] as const;

function visibility(
  overrides: Partial<Record<(typeof VISIBILITY_KEYS)[number], VisibilityLevel>>,
): MemberDocument["visibility"] {
  return Object.fromEntries(
    VISIBILITY_KEYS.map((key) => [key, overrides[key] ?? "private"]),
  ) as MemberDocument["visibility"];
}

/** members ドキュメントを直に書く。公開判定はこの中身にしか依存しない */
async function putMember(
  discordId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await firebaseAdmin
    .firestore()
    .collection("members")
    .doc(discordId)
    .set(data);
}

describe("Blogs CRUD", () => {
  const authorId = "user-123";
  const otherAuthorId = "user-456";

  const validInput = {
    url: "https://example.com/my-blog",
    title: "はじめての記事",
    publishedAt: "2026-01-01",
  };

  beforeEach(async () => {
    const db = firebaseAdmin.firestore();
    const collections = await db.listCollections();
    for (const collection of collections) {
      const docs = await collection.listDocuments();
      for (const doc of docs) {
        await doc.delete();
      }
    }
  });

  it("creates a blog and lists it for the author and publicly", async () => {
    const created = await createBlog(authorId, validInput);
    expect(created.authorId).toBe(authorId);
    expect(created.url).toBe(validInput.url);

    const mine = await listBlogsByAuthor(authorId);
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe(validInput.title);

    const all = await listAllBlogs();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
  });

  it("excludes other authors' blogs from the author's own list", async () => {
    const mineDoc = await createBlog(authorId, validInput);
    await createBlog(otherAuthorId, {
      ...validInput,
      title: "他人の記事",
      url: "https://example.com/other",
    });

    const mine = await listBlogsByAuthor(authorId);
    expect(mine.map((b) => b.id)).toEqual([mineDoc.id]);

    // コレクション全体のほうは両方出る
    expect(await listAllBlogs()).toHaveLength(2);
  });

  it("rejects updating another author's blog", async () => {
    const created = await createBlog(authorId, validInput);

    await expectBlogError(
      updateBlog(created.id, otherAuthorId, {
        ...validInput,
        title: "書き換えたタイトル",
      }),
      BLOG_ERROR_CODES.FORBIDDEN,
    );

    const [mine] = await listBlogsByAuthor(authorId);
    expect(mine.title).toBe(validInput.title);
  });

  it("rejects deleting another author's blog", async () => {
    const created = await createBlog(authorId, validInput);

    await expectBlogError(
      deleteBlog(created.id, otherAuthorId),
      BLOG_ERROR_CODES.FORBIDDEN,
    );

    expect(await listBlogsByAuthor(authorId)).toHaveLength(1);
  });

  it("allows the owner to update and delete their own blog", async () => {
    const created = await createBlog(authorId, validInput);

    await updateBlog(created.id, authorId, {
      ...validInput,
      title: "更新後のタイトル",
    });
    const [updated] = await listBlogsByAuthor(authorId);
    expect(updated.title).toBe("更新後のタイトル");

    await deleteBlog(created.id, authorId);
    expect(await listBlogsByAuthor(authorId)).toHaveLength(0);
  });

  it("rejects deleting a blog that does not exist", async () => {
    await expectBlogError(
      deleteBlog("no-such-id", authorId),
      BLOG_ERROR_CODES.NOT_FOUND,
    );
  });

  it("rejects an invalid URL on create", async () => {
    await expectBlogError(
      createBlog(authorId, { ...validInput, url: "not-a-url" }),
      BLOG_ERROR_CODES.INVALID_URL,
    );
  });

  it("rejects an empty title on create", async () => {
    await expectBlogError(
      createBlog(authorId, { ...validInput, title: "" }),
      BLOG_ERROR_CODES.TITLE_REQUIRED,
    );
  });

  it("rejects an invalid thumbnail URL on create", async () => {
    await expectBlogError(
      createBlog(authorId, {
        ...validInput,
        thumbnailUrl: "javascript:alert(1)",
      }),
      BLOG_ERROR_CODES.INVALID_THUMBNAIL_URL,
    );
  });

  it("rejects a publishedAt that is not YYYY-MM-DD on create", async () => {
    await expectBlogError(
      createBlog(authorId, { ...validInput, publishedAt: "2026/01/01" }),
      BLOG_ERROR_CODES.INVALID_PUBLISHED_AT,
    );
  });

  it("rejects an invalid URL on update", async () => {
    const created = await createBlog(authorId, validInput);

    await expectBlogError(
      updateBlog(created.id, authorId, {
        ...validInput,
        url: "ftp://example.com",
      }),
      BLOG_ERROR_CODES.INVALID_URL,
    );
  });

  it("rejects an empty title on update", async () => {
    const created = await createBlog(authorId, validInput);

    await expectBlogError(
      updateBlog(created.id, authorId, { ...validInput, title: "" }),
      BLOG_ERROR_CODES.TITLE_REQUIRED,
    );
  });

  it("orders blogs by publishedAt descending", async () => {
    await createBlog(authorId, { ...validInput, publishedAt: "2026-01-01" });
    await createBlog(authorId, { ...validInput, publishedAt: "2026-03-01" });
    await createBlog(authorId, { ...validInput, publishedAt: "2026-02-01" });

    const all = await listAllBlogs();
    expect(all.map((a) => a.publishedAt)).toEqual([
      "2026-03-01",
      "2026-02-01",
      "2026-01-01",
    ]);
  });
});

describe("parseBlogInput", () => {
  const validBody = {
    url: "https://example.com/my-blog",
    title: "はじめての記事",
    publishedAt: "2026-01-01",
  };

  it("文字列だけのボディをそのまま BlogInput にする", () => {
    expect(
      parseBlogInput({ ...validBody, platform: "Zenn", description: "説明" }),
    ).toEqual({
      url: validBody.url,
      title: validBody.title,
      publishedAt: validBody.publishedAt,
      description: "説明",
      thumbnailUrl: undefined,
      platform: "Zenn",
    });
  });

  it("空文字の任意項目は未入力として落とす", () => {
    const parsed = parseBlogInput({
      ...validBody,
      description: "",
      thumbnailUrl: "",
      platform: "",
    });
    expect(parsed.description).toBeUndefined();
    expect(parsed.thumbnailUrl).toBeUndefined();
    expect(parsed.platform).toBeUndefined();
  });

  it("知らないキーは無視する (authorId を本文から奪えない)", () => {
    expect(
      parseBlogInput({ ...validBody, authorId: "someone-else" }),
    ).not.toHaveProperty("authorId");
  });

  it("publishedAt が文字列でなければ弾く", () => {
    // これを通すと byPublishedAtDesc が落ちて記事管理ページが開けなくなる
    expect(() =>
      parseBlogInput({ ...validBody, publishedAt: 20260101 }),
    ).toThrow(BlogError);
    try {
      parseBlogInput({ ...validBody, publishedAt: 20260101 });
    } catch (e) {
      expect((e as BlogError).code).toBe(BLOG_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("publishedAt が欠けていれば弾く", () => {
    expect(() => parseBlogInput({ url: validBody.url, title: "t" })).toThrow(
      BlogError,
    );
  });

  it("本文が JSON として読めなかった場合 (null) も弾く", () => {
    expect(() => parseBlogInput(null)).toThrow(BlogError);
  });

  it("形が正しくても中身が不正なら該当するコードで弾く", () => {
    try {
      parseBlogInput({ ...validBody, thumbnailUrl: "not-a-url" });
    } catch (e) {
      expect((e as BlogError).code).toBe(
        BLOG_ERROR_CODES.INVALID_THUMBNAIL_URL,
      );
    }
  });
});

describe("listPublicBlogs", () => {
  const authorId = "user-123";
  const validInput = {
    url: "https://example.com/my-blog",
    title: "はじめての記事",
    publishedAt: "2026-01-01",
  };

  beforeEach(async () => {
    const db = firebaseAdmin.firestore();
    const collections = await db.listCollections();
    for (const collection of collections) {
      const docs = await collection.listDocuments();
      for (const doc of docs) {
        await doc.delete();
      }
    }
  });

  it("公開を許可しているメンバーは公開ページと同じ表示名で出る", async () => {
    await putMember(authorId, {
      nickname: "ともや",
      discordUsername: "tomoya_discord",
      onboardingCompleted: true,
      allowPublic: true,
      visibility: visibility({ nickname: "public" }),
    });
    await createBlog(authorId, validInput);

    const [blog] = await listPublicBlogs();
    expect(blog.authorName).toBe("ともや");
  });

  it("公開を許可していないメンバーの名前は出さない", async () => {
    await putMember(authorId, {
      nickname: "ともや",
      discordUsername: "tomoya_discord",
      onboardingCompleted: true,
      allowPublic: false,
      visibility: visibility({ nickname: "public" }),
    });
    await createBlog(authorId, validInput);

    const [blog] = await listPublicBlogs();
    // 記事そのものは出す。出さないのは名前だけ
    expect(blog.title).toBe(validInput.title);
    expect(blog.authorName).toBe(PUBLIC_AUTHOR_FALLBACK_NAME);
  });

  it("ニックネームを非公開にしているメンバーの名前は出さない", async () => {
    await putMember(authorId, {
      nickname: "ともや",
      discordUsername: "tomoya_discord",
      onboardingCompleted: true,
      allowPublic: true,
      visibility: visibility({ nickname: "private" }),
    });
    await createBlog(authorId, validInput);

    const [blog] = await listPublicBlogs();
    expect(blog.authorName).not.toBe("ともや");
  });

  it("members ドキュメントが無い著者の名前は出さない", async () => {
    await createBlog(authorId, validInput);

    const [blog] = await listPublicBlogs();
    expect(blog.authorName).toBe(PUBLIC_AUTHOR_FALLBACK_NAME);
  });

  it("退会済みメンバーの記事は公開一覧に出さない", async () => {
    await putMember(authorId, {
      nickname: "ともや",
      discordUsername: "tomoya_discord",
      onboardingCompleted: true,
      allowPublic: true,
      optedOut: true,
      visibility: visibility({ nickname: "public" }),
    });
    await createBlog(authorId, validInput);

    expect(await listPublicBlogs()).toHaveLength(0);
    // 記事自体は消していないので、再加入すればまた出る
    expect(await listAllBlogs()).toHaveLength(1);
  });

  it("公開日の新しい順のまま返す", async () => {
    await createBlog(authorId, { ...validInput, publishedAt: "2026-01-01" });
    await createBlog(authorId, { ...validInput, publishedAt: "2026-03-01" });

    expect((await listPublicBlogs()).map((b) => b.publishedAt)).toEqual([
      "2026-03-01",
      "2026-01-01",
    ]);
  });
});
