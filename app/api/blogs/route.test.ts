import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLOG_ERROR_CODES, BlogError, type Blog } from "@/types/blog";
import { POST } from "./route";

const { auth, createBlog, notifyBlogChannel } = vi.hoisted(() => ({
  auth: vi.fn(),
  createBlog: vi.fn(),
  notifyBlogChannel: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));

// 入力の検証 (parseBlogInput) は本物を通し、Firestore への書き込みだけを差し替える
vi.mock("@/lib/blogs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blogs")>()),
  createBlog,
}));

vi.mock("@/lib/blog-notification", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/blog-notification")>()),
  notifyBlogChannel,
}));

// after() はリクエストの外では動かないので、受け取った処理をその場で走らせて完了を待てるようにする
const afterTasks: Promise<unknown>[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => Promise<unknown>) => {
    afterTasks.push(task());
  },
}));

const INPUT = {
  url: "https://qiita.com/someone/items/abc",
  title: "記事タイトル",
  publishedAt: "2026-10-20",
};

const CREATED: Blog = {
  id: "blog-1",
  authorId: "123456789",
  ...INPUT,
  createdAt: 0,
};

function postRequest(body: unknown) {
  return new Request("https://example.test/api/blogs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  auth.mockResolvedValue({ user: { id: "123456789", optedOut: false } });
  createBlog.mockResolvedValue(CREATED);
  notifyBlogChannel.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  afterTasks.length = 0;
});

describe("POST /api/blogs の Discord 通知", () => {
  it("登録に成功したら、書いた人をメンションした通知を送る", async () => {
    const res = await POST(postRequest(INPUT));
    await Promise.all(afterTasks);

    expect(res.status).toBe(200);
    expect(notifyBlogChannel).toHaveBeenCalledTimes(1);
    const [payload] = notifyBlogChannel.mock.calls[0];
    expect(payload.embeds[0].title).toBe("記事タイトル");
    expect(payload.embeds[0].description).toContain("<@123456789>");
  });

  it("通知に失敗しても、登録は 200 のまま (ログだけ残す)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    notifyBlogChannel.mockRejectedValue(new Error("Discord is down"));

    const res = await POST(postRequest(INPUT));
    await Promise.all(afterTasks);

    expect(res.status).toBe(200);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to notify blog channel:",
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("入力が不正で登録できなければ、通知しない", async () => {
    const res = await POST(postRequest({ ...INPUT, title: "" }));
    await Promise.all(afterTasks);

    expect(res.status).toBe(400);
    expect(createBlog).not.toHaveBeenCalled();
    expect(notifyBlogChannel).not.toHaveBeenCalled();
  });

  it("保存に失敗したら、通知しない", async () => {
    createBlog.mockRejectedValue(new BlogError(BLOG_ERROR_CODES.INVALID_URL));

    const res = await POST(postRequest(INPUT));
    await Promise.all(afterTasks);

    expect(res.status).toBe(400);
    expect(notifyBlogChannel).not.toHaveBeenCalled();
  });

  it("未ログイン・退会済みなら登録も通知もしない", async () => {
    auth.mockResolvedValueOnce(null);
    expect((await POST(postRequest(INPUT))).status).toBe(401);

    auth.mockResolvedValueOnce({ user: { id: "123456789", optedOut: true } });
    expect((await POST(postRequest(INPUT))).status).toBe(403);

    await Promise.all(afterTasks);
    expect(createBlog).not.toHaveBeenCalled();
    expect(notifyBlogChannel).not.toHaveBeenCalled();
  });
});
