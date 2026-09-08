import { describe, it, expect, beforeEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  listPublishedNews,
  listAllNews,
  getNewsArticle,
  getPublishedNewsArticle,
  createNews,
  updateNews,
  publishNews,
  unpublishNews,
  deleteNews,
} from "./news";
import { parseNewsInput } from "./news";
import { NEWS_ERROR_CODES, NewsError } from "@/types/news";

type NewsInput = Parameters<typeof createNews>[0];

// Initialize Firebase for tests
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const authorId = "user-123";

function buildInput(overrides: Partial<NewsInput> = {}): NewsInput {
  return {
    date: "2026年4月1日",
    title: "テスト記事",
    summary: "テスト用の概要",
    body: "テスト用の本文",
    image: "/assets/test.png",
    category: "プロジェクト",
    ...overrides,
  };
}

describe("News CRUD Logic", () => {
  beforeEach(async () => {
    // Clear the news collection before each test
    const db = firebaseAdmin.firestore();
    const docs = await db.collection("news").listDocuments();
    for (const doc of docs) {
      await doc.delete();
    }
  });

  it("should create an article as a draft", async () => {
    const id = await createNews(buildInput(), authorId);

    const article = await getNewsArticle(id);
    expect(article).not.toBeNull();
    expect(article?.title).toBe("テスト記事");
    expect(article?.status).toBe("draft");
    expect(article?.publishedAt).toBeNull();
    expect(article?.authorId).toBe(authorId);
    expect(article?.createdAt).not.toBeNull();
  });

  it("should create an article with an explicit id to keep existing URLs", async () => {
    const id = await createNews(buildInput(), authorId, "9");

    expect(id).toBe("9");
    expect(await getNewsArticle("9")).not.toBeNull();
  });

  it("should return null for an article that does not exist", async () => {
    expect(await getNewsArticle("missing")).toBeNull();
  });

  it("should hide drafts from the public getter", async () => {
    const id = await createNews(buildInput(), authorId);

    expect(await getPublishedNewsArticle(id)).toBeNull();

    await publishNews(id);
    expect(await getPublishedNewsArticle(id)).not.toBeNull();
  });

  it("should hide drafts from the public list but keep them in the admin list", async () => {
    const draftId = await createNews(buildInput({ title: "下書き" }), authorId);
    const publishedId = await createNews(
      buildInput({ title: "公開済み" }),
      authorId,
    );
    await publishNews(publishedId);

    const published = await listPublishedNews();
    expect(published).toHaveLength(1);
    expect(published[0].id).toBe(publishedId);

    const all = await listAllNews();
    expect(all.map((a) => a.id).sort()).toEqual([draftId, publishedId].sort());
  });

  it("should set publishedAt when publishing", async () => {
    const id = await createNews(buildInput(), authorId);
    await publishNews(id);

    const article = await getNewsArticle(id);
    expect(article?.status).toBe("published");
    expect(article?.publishedAt).not.toBeNull();
  });

  it("should accept an explicit publishedAt for backdated articles", async () => {
    const id = await createNews(buildInput(), authorId);
    const backdated = new Date("2025-12-11T00:00:00.000Z");
    await publishNews(id, backdated);

    const article = await getNewsArticle(id);
    expect(article?.publishedAt).toBe(backdated.toISOString());
  });

  it("should keep the original publishedAt when re-publishing", async () => {
    const id = await createNews(buildInput(), authorId);
    const original = new Date("2025-12-11T00:00:00.000Z");
    await publishNews(id, original);

    await unpublishNews(id);
    const unpublished = await getNewsArticle(id);
    expect(unpublished?.status).toBe("draft");
    expect(unpublished?.publishedAt).toBe(original.toISOString());

    await publishNews(id);
    const republished = await getNewsArticle(id);
    expect(republished?.status).toBe("published");
    expect(republished?.publishedAt).toBe(original.toISOString());
  });

  it("should throw NOT_FOUND when operating on an article that does not exist", async () => {
    await expect(publishNews("missing")).rejects.toThrow(NewsError);
    await expect(unpublishNews("missing")).rejects.toThrow(NewsError);
    await expect(deleteNews("missing")).rejects.toThrow(NewsError);
    await expect(updateNews("missing", buildInput())).rejects.toThrow(
      NewsError,
    );
  });

  it("should update content without changing the publish state", async () => {
    const id = await createNews(buildInput(), authorId);
    await publishNews(id);

    await updateNews(id, buildInput({ title: "更新後のタイトル" }));

    const article = await getNewsArticle(id);
    expect(article?.title).toBe("更新後のタイトル");
    expect(article?.status).toBe("published");
    expect(article?.publishedAt).not.toBeNull();
  });

  it("should sort published articles newest first", async () => {
    const older = await createNews(buildInput({ title: "古い" }), authorId);
    const newer = await createNews(buildInput({ title: "新しい" }), authorId);
    await publishNews(older, new Date("2025-05-24T00:00:00.000Z"));
    await publishNews(newer, new Date("2025-12-11T00:00:00.000Z"));

    const articles = await listPublishedNews();
    expect(articles.map((a) => a.title)).toEqual(["新しい", "古い"]);
  });

  it("should sort drafts without publishedAt to the end of the admin list", async () => {
    const draft = await createNews(buildInput({ title: "下書き" }), authorId);
    const published = await createNews(
      buildInput({ title: "公開済み" }),
      authorId,
    );
    await publishNews(published, new Date("2025-12-11T00:00:00.000Z"));

    const articles = await listAllNews();
    expect(articles.map((a) => a.title)).toEqual(["公開済み", "下書き"]);
    expect(articles[1].id).toBe(draft);
  });

  it("should preserve free-form display dates", async () => {
    const id = await createNews(
      buildInput({ date: "2025年5月21-23日" }),
      authorId,
    );
    await publishNews(id);

    const article = await getPublishedNewsArticle(id);
    expect(article?.date).toBe("2025年5月21-23日");
  });

  it("should delete an article", async () => {
    const id = await createNews(buildInput(), authorId);
    await deleteNews(id);

    expect(await getNewsArticle(id)).toBeNull();
    expect(await listAllNews()).toHaveLength(0);
  });
});

describe("parseNewsInput", () => {
  function expectCode(body: unknown, code: string) {
    try {
      parseNewsInput(body);
    } catch (error) {
      expect(error).toBeInstanceOf(NewsError);
      expect((error as NewsError).code).toBe(code);
      return;
    }
    throw new Error("parseNewsInput should have thrown");
  }

  it("should accept a valid body", () => {
    const input = parseNewsInput(buildInput());
    expect(input.title).toBe("テスト記事");
    expect(input.category).toBe("プロジェクト");
  });

  it("should reject a body with missing or non-string fields", () => {
    expectCode({ title: "タイトルのみ" }, NEWS_ERROR_CODES.INVALID_INPUT);
    expectCode({ ...buildInput(), title: 123 }, NEWS_ERROR_CODES.INVALID_INPUT);
    expectCode(null, NEWS_ERROR_CODES.INVALID_INPUT);
  });

  it("should reject blank required fields", () => {
    expectCode(buildInput({ title: "   " }), NEWS_ERROR_CODES.TITLE_REQUIRED);
    expectCode(buildInput({ body: "" }), NEWS_ERROR_CODES.BODY_REQUIRED);
    expectCode(buildInput({ date: "" }), NEWS_ERROR_CODES.DATE_REQUIRED);
  });

  it("should reject an unknown category", () => {
    expectCode(
      { ...buildInput(), category: "お知らせ" },
      NEWS_ERROR_CODES.INVALID_CATEGORY,
    );
  });

  it("should accept both absolute URLs and public/assets paths for the image", () => {
    expect(
      parseNewsInput(buildInput({ image: "/assets/pizza.png" })).image,
    ).toBe("/assets/pizza.png");
    expect(
      parseNewsInput(
        buildInput({ image: "https://storage.googleapis.com/x/y.jpg" }),
      ).image,
    ).toBe("https://storage.googleapis.com/x/y.jpg");
    // 画像なしのお知らせも許す
    expect(parseNewsInput(buildInput({ image: "" })).image).toBe("");
  });

  it("should reject an image path that is neither", () => {
    expectCode(
      buildInput({ image: "assets/pizza.png" }),
      NEWS_ERROR_CODES.INVALID_IMAGE_URL,
    );
  });
});
