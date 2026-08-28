import { describe, it, expect } from "vitest";
import { BLOG_ERROR_CODES, BLOG_ERROR_RESPONSES, BlogError } from "./blog";

describe("BlogError", () => {
  it("コードを保持し、対応する日本語メッセージを message に持つ", () => {
    const e = new BlogError(BLOG_ERROR_CODES.FORBIDDEN);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe(BLOG_ERROR_CODES.FORBIDDEN);
    expect(e.message).toBe(BLOG_ERROR_RESPONSES.FORBIDDEN.message);
  });

  it("すべてのコードに status とメッセージが定義されている", () => {
    for (const code of Object.values(BLOG_ERROR_CODES)) {
      const res = BLOG_ERROR_RESPONSES[code];
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.message.length).toBeGreaterThan(0);
    }
  });
});
