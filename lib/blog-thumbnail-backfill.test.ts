import { describe, it, expect, beforeEach, vi } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  applyThumbnailBackfill,
  isImageReachable,
  planThumbnail,
  planThumbnailBackfill,
} from "./blog-thumbnail-backfill";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const QIITA_URL = "https://qiita.com/Tivo0921/items/abc";
const OGP_IMAGE = "https://qiita-user-contents.imgix.net/ogp.png";
const OLD_IMAGE = "https://example.com/old.png";

function imageResponse(status = 200, type = "image/png") {
  return new Response(status === 200 ? "x" : null, {
    status,
    headers: { "content-type": type },
  });
}

function ogpHtml(image?: string) {
  return new Response(
    `<html><head><meta property="og:title" content="記事">${
      image ? `<meta property="og:image" content="${image}">` : ""
    }</head></html>`,
    { status: 200, headers: { "content-type": "text/html" } },
  );
}

/** URL ごとに応答を返す fetch のモック。登録していない URL は 404 */
function fetchByUrl(
  routes: Record<string, (init?: RequestInit) => Response | Promise<Response>>,
) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const key = String(input instanceof Request ? input.url : input);
    const route = routes[key];
    return route ? route(init) : new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
}

describe("isImageReachable", () => {
  it("画像を返す https の URL は true", async () => {
    const f = fetchByUrl({ [OLD_IMAGE]: () => imageResponse() });
    expect(await isImageReachable(OLD_IMAGE, f)).toBe(true);
  });

  it("404 や画像以外の応答は false", async () => {
    expect(
      await isImageReachable(
        OLD_IMAGE,
        fetchByUrl({ [OLD_IMAGE]: () => imageResponse(404) }),
      ),
    ).toBe(false);
    expect(
      await isImageReachable(
        OLD_IMAGE,
        fetchByUrl({ [OLD_IMAGE]: () => imageResponse(200, "text/html") }),
      ),
    ).toBe(false);
  });

  it("http・不正な URL は通信せずに false", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    expect(await isImageReachable("http://example.com/a.png", f)).toBe(false);
    expect(await isImageReachable("not a url", f)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("HEAD が 405 なら GET で確かめる", async () => {
    const f = fetchByUrl({
      [OLD_IMAGE]: (init) =>
        init?.method === "HEAD" ? imageResponse(405) : imageResponse(),
    });
    expect(await isImageReachable(OLD_IMAGE, f)).toBe(true);
  });

  it("通信エラーは例外にせず false", async () => {
    const f = vi
      .fn()
      .mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    expect(await isImageReachable(OLD_IMAGE, f)).toBe(false);
  });
});

describe("planThumbnail", () => {
  it("今のサムネイルが表示できるなら何もしない（元記事も取得しない）", async () => {
    const f = fetchByUrl({ [OLD_IMAGE]: () => imageResponse() });
    expect(
      await planThumbnail({ url: QIITA_URL, thumbnailUrl: OLD_IMAGE }, f),
    ).toEqual({
      kind: "keep",
    });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("サムネイルが無ければ OGP 画像を入れる", async () => {
    const f = fetchByUrl({
      [QIITA_URL]: () => ogpHtml(OGP_IMAGE),
      [OGP_IMAGE]: () => imageResponse(),
    });
    expect(await planThumbnail({ url: QIITA_URL }, f)).toEqual({
      kind: "set",
      thumbnailUrl: OGP_IMAGE,
      reason: "missing",
    });
  });

  it("サムネイルがリンク切れなら OGP 画像に差し替える", async () => {
    const f = fetchByUrl({
      [QIITA_URL]: () => ogpHtml(OGP_IMAGE),
      [OGP_IMAGE]: () => imageResponse(),
    });
    expect(
      await planThumbnail({ url: QIITA_URL, thumbnailUrl: OLD_IMAGE }, f),
    ).toEqual({
      kind: "set",
      thumbnailUrl: OGP_IMAGE,
      reason: "broken",
    });
  });

  it("リンク切れで OGP 画像も無ければ消す", async () => {
    const f = fetchByUrl({ [QIITA_URL]: () => ogpHtml() });
    expect(
      await planThumbnail({ url: QIITA_URL, thumbnailUrl: OLD_IMAGE }, f),
    ).toEqual({
      kind: "clear",
    });
  });

  it("OGP 画像もリンク切れなら入れない", async () => {
    const f = fetchByUrl({ [QIITA_URL]: () => ogpHtml(OGP_IMAGE) });
    expect(await planThumbnail({ url: QIITA_URL }, f)).toEqual({
      kind: "keep",
    });
  });

  it("リンク切れの URL と OGP 画像が同じなら、差し替えではなく消す", async () => {
    const f = fetchByUrl({ [QIITA_URL]: () => ogpHtml(OGP_IMAGE) });
    expect(
      await planThumbnail({ url: QIITA_URL, thumbnailUrl: OGP_IMAGE }, f),
    ).toEqual({
      kind: "clear",
    });
  });

  it("自動取得に対応していない媒体で画像が無ければ何もしない", async () => {
    const f = vi.fn() as unknown as typeof fetch;
    expect(await planThumbnail({ url: "https://note.com/a/n/b" }, f)).toEqual({
      kind: "keep",
    });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("planThumbnailBackfill / applyThumbnailBackfill", () => {
  beforeEach(async () => {
    const db = firebaseAdmin.firestore();
    for (const collection of await db.listCollections()) {
      for (const doc of await collection.listDocuments()) await doc.delete();
    }
  });

  it("計画の時点では書き込まず、反映すると set と clear だけが更新される", async () => {
    const db = firebaseAdmin.firestore();
    const blogs = db.collection("blogs");
    await blogs
      .doc("ok")
      .set({ url: QIITA_URL, thumbnailUrl: OGP_IMAGE, title: "a" });
    await blogs.doc("missing").set({ url: QIITA_URL, title: "b" });
    await blogs.doc("broken").set({
      url: "https://zenn.dev/a/articles/b",
      thumbnailUrl: OLD_IMAGE,
      title: "c",
    });
    await blogs.doc("nourl").set({ title: "d" });

    const f = fetchByUrl({
      [QIITA_URL]: () => ogpHtml(OGP_IMAGE),
      [OGP_IMAGE]: () => imageResponse(),
      "https://zenn.dev/a/articles/b": () => ogpHtml(),
    });
    const plan = await planThumbnailBackfill(f);
    const byId = Object.fromEntries(plan.map((p) => [p.id, p.action.kind]));
    expect(byId).toEqual({ ok: "keep", missing: "set", broken: "clear" });

    // 計画だけでは変わらない
    expect(
      (await blogs.doc("missing").get()).data()?.thumbnailUrl,
    ).toBeUndefined();

    expect(await applyThumbnailBackfill(plan)).toBe(2);
    expect((await blogs.doc("missing").get()).data()?.thumbnailUrl).toBe(
      OGP_IMAGE,
    );
    expect((await blogs.doc("broken").get()).data()).not.toHaveProperty(
      "thumbnailUrl",
    );
    expect((await blogs.doc("ok").get()).data()?.thumbnailUrl).toBe(OGP_IMAGE);
    // 他の項目は変えない
    expect((await blogs.doc("broken").get()).data()?.title).toBe("c");
  });

  it("変更が無ければ書き込まない", async () => {
    expect(await applyThumbnailBackfill([])).toBe(0);
  });
});
