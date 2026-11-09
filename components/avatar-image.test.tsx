import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AvatarImage,
  DEFAULT_AVATAR_SRC,
  resolveAvatarSrc,
} from "./avatar-image";

const LINE = "https://profile.line-scdn.net/old";

describe("resolveAvatarSrc", () => {
  it("失敗していなければ元の画像", () => {
    expect(resolveAvatarSrc(LINE, null, DEFAULT_AVATAR_SRC)).toBe(LINE);
  });

  it("今の URL で失敗したら既定画像", () => {
    expect(resolveAvatarSrc(LINE, LINE, DEFAULT_AVATAR_SRC)).toBe(
      DEFAULT_AVATAR_SRC,
    );
  });

  it("既定画像の指定がなければ何も表示しない", () => {
    expect(resolveAvatarSrc(LINE, LINE, undefined)).toBeNull();
  });

  it("失敗したのが前の URL なら、新しい URL を読み込み直す", () => {
    expect(resolveAvatarSrc("https://new", LINE, DEFAULT_AVATAR_SRC)).toBe(
      "https://new",
    );
  });

  it("src が空なら既定画像", () => {
    expect(resolveAvatarSrc("", null, DEFAULT_AVATAR_SRC)).toBe(
      DEFAULT_AVATAR_SRC,
    );
    expect(resolveAvatarSrc("", null, undefined)).toBeNull();
  });
});

describe("AvatarImage", () => {
  it("最初は元の画像を出す", () => {
    const html = renderToStaticMarkup(
      <AvatarImage src={LINE} alt="写真" fallbackSrc={DEFAULT_AVATAR_SRC} />,
    );
    expect(html).toContain("<img");
    expect(html).toContain("line-scdn.net");
  });

  it("src が空で既定画像も無ければ何も出さない", () => {
    expect(renderToStaticMarkup(<AvatarImage src="" alt="" />)).toBe("");
  });
});
