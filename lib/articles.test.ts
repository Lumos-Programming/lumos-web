import { describe, it, expect, beforeEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  listPublishedArticles,
  listArticlesByAuthor,
  createArticle,
  updateArticle,
  deleteArticle,
} from "./articles";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

describe("Articles CRUD", () => {
  const authorId = "user-123";
  const otherAuthorId = "user-456";

  const validInput = {
    url: "https://example.com/my-article",
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

  it("creates an article and lists it for the author and publicly", async () => {
    const created = await createArticle(authorId, validInput);
    expect(created.authorId).toBe(authorId);
    expect(created.url).toBe(validInput.url);

    const mine = await listArticlesByAuthor(authorId);
    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe(validInput.title);

    const published = await listPublishedArticles();
    expect(published).toHaveLength(1);
    expect(published[0].id).toBe(created.id);
  });

  it("rejects updating another author's article", async () => {
    const created = await createArticle(authorId, validInput);

    await expect(
      updateArticle(created.id, otherAuthorId, {
        ...validInput,
        title: "書き換えたタイトル",
      }),
    ).rejects.toThrow("Unauthorized");

    const [mine] = await listArticlesByAuthor(authorId);
    expect(mine.title).toBe(validInput.title);
  });

  it("rejects deleting another author's article", async () => {
    const created = await createArticle(authorId, validInput);

    await expect(deleteArticle(created.id, otherAuthorId)).rejects.toThrow(
      "Unauthorized",
    );

    expect(await listArticlesByAuthor(authorId)).toHaveLength(1);
  });

  it("allows the owner to update and delete their own article", async () => {
    const created = await createArticle(authorId, validInput);

    await updateArticle(created.id, authorId, {
      ...validInput,
      title: "更新後のタイトル",
    });
    const [updated] = await listArticlesByAuthor(authorId);
    expect(updated.title).toBe("更新後のタイトル");

    await deleteArticle(created.id, authorId);
    expect(await listArticlesByAuthor(authorId)).toHaveLength(0);
  });

  it("rejects an invalid URL on create", async () => {
    await expect(
      createArticle(authorId, { ...validInput, url: "not-a-url" }),
    ).rejects.toThrow();
  });

  it("rejects an empty title on create", async () => {
    await expect(
      createArticle(authorId, { ...validInput, title: "" }),
    ).rejects.toThrow();
  });

  it("rejects an invalid URL on update", async () => {
    const created = await createArticle(authorId, validInput);

    await expect(
      updateArticle(created.id, authorId, {
        ...validInput,
        url: "ftp://example.com",
      }),
    ).rejects.toThrow();
  });

  it("rejects an empty title on update", async () => {
    const created = await createArticle(authorId, validInput);

    await expect(
      updateArticle(created.id, authorId, { ...validInput, title: "" }),
    ).rejects.toThrow();
  });

  it("orders published articles by publishedAt descending", async () => {
    await createArticle(authorId, { ...validInput, publishedAt: "2026-01-01" });
    await createArticle(authorId, { ...validInput, publishedAt: "2026-03-01" });
    await createArticle(authorId, { ...validInput, publishedAt: "2026-02-01" });

    const published = await listPublishedArticles();
    expect(published.map((a) => a.publishedAt)).toEqual([
      "2026-03-01",
      "2026-02-01",
      "2026-01-01",
    ]);
  });
});
