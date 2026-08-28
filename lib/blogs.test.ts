import { describe, it, expect, beforeEach } from "vitest";
import { BLOG_ERROR_CODES, BlogError } from "@/types/blog";
import * as firebaseAdmin from "firebase-admin";
import {
  listPublishedBlogs,
  listBlogsByAuthor,
  createBlog,
  updateBlog,
  deleteBlog,
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

    const published = await listPublishedBlogs();
    expect(published).toHaveLength(1);
    expect(published[0].id).toBe(created.id);
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

    // 公開一覧のほうは両方出る
    expect(await listPublishedBlogs()).toHaveLength(2);
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

  it("orders published blogs by publishedAt descending", async () => {
    await createBlog(authorId, { ...validInput, publishedAt: "2026-01-01" });
    await createBlog(authorId, { ...validInput, publishedAt: "2026-03-01" });
    await createBlog(authorId, { ...validInput, publishedAt: "2026-02-01" });

    const published = await listPublishedBlogs();
    expect(published.map((a) => a.publishedAt)).toEqual([
      "2026-03-01",
      "2026-02-01",
      "2026-01-01",
    ]);
  });
});
