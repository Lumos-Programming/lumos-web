// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AvatarImage,
  DEFAULT_AVATAR_SRC,
  resolveAvatarSrc,
} from "./avatar-image";

// React に act() 環境だと知らせる（警告抑止）
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const A = "https://profile.line-scdn.net/a";
const B = "https://profile.line-scdn.net/b";
const FRAME = "relative w-8 h-8";

describe("resolveAvatarSrc", () => {
  it("失敗していなければ元の画像", () => {
    expect(resolveAvatarSrc(A, false, DEFAULT_AVATAR_SRC)).toBe(A);
  });

  it("失敗したら既定画像", () => {
    expect(resolveAvatarSrc(A, true, DEFAULT_AVATAR_SRC)).toBe(
      DEFAULT_AVATAR_SRC,
    );
  });

  it("既定画像の指定がなければ何も表示しない", () => {
    expect(resolveAvatarSrc(A, true, undefined)).toBeNull();
  });

  it("src が空なら既定画像、指定がなければ null", () => {
    expect(resolveAvatarSrc("", false, DEFAULT_AVATAR_SRC)).toBe(
      DEFAULT_AVATAR_SRC,
    );
    expect(resolveAvatarSrc("", false, undefined)).toBeNull();
  });
});

describe("AvatarImage（サーバー描画）", () => {
  it("最初は元の画像を枠の中に出す", () => {
    const html = renderToStaticMarkup(
      <AvatarImage
        src={A}
        alt="写真"
        wrapperClassName={FRAME}
        fallbackSrc={DEFAULT_AVATAR_SRC}
      />,
    );
    expect(html).toMatch(/^<div class="relative w-8 h-8"><img/);
    expect(html).toContain("line-scdn.net");
  });

  it("src が空で既定画像も無ければ枠ごと出さない", () => {
    expect(
      renderToStaticMarkup(
        <AvatarImage src="" alt="" wrapperClassName={FRAME} />,
      ),
    ).toBe("");
  });
});

describe("AvatarImage（ブラウザでの読み込み失敗）", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (src: string, fallbackSrc?: string) =>
    act(() =>
      root.render(
        <AvatarImage
          src={src}
          alt="写真"
          wrapperClassName={FRAME}
          fallbackSrc={fallbackSrc}
        />,
      ),
    );
  const img = () => container.querySelector("img");
  /** 画像の読み込み失敗（404 など）を起こす */
  const fail = () =>
    act(() => {
      img()!.dispatchEvent(new Event("error"));
    });
  // next/image は src を /_next/image?url=... に変えるので、元の URL を含むかで判定する
  const shows = (url: string) =>
    decodeURIComponent(img()?.getAttribute("src") ?? "").includes(url);

  it("読み込みに失敗したら既定画像に切り替わる", () => {
    render(A, DEFAULT_AVATAR_SRC);
    expect(shows(A)).toBe(true);
    fail();
    expect(shows(DEFAULT_AVATAR_SRC)).toBe(true);
    expect(shows(A)).toBe(false);
  });

  it("既定画像まで失敗しても、それ以上は切り替えず無限ループしない", () => {
    render(A, DEFAULT_AVATAR_SRC);
    fail();
    fail();
    expect(shows(DEFAULT_AVATAR_SRC)).toBe(true);
  });

  it("既定画像の指定がなければ、失敗したら枠（div）ごと消える", () => {
    render(A);
    expect(container.querySelector("div")).not.toBeNull();
    fail();
    expect(container.innerHTML).toBe("");
  });

  it("失敗後に別の URL に変わったら、その URL を読み込む", () => {
    render(A, DEFAULT_AVATAR_SRC);
    fail();
    render(B, DEFAULT_AVATAR_SRC);
    expect(shows(B)).toBe(true);
  });

  it("A で失敗 → B → A と戻ったら、A を読み込み直す", () => {
    render(A, DEFAULT_AVATAR_SRC);
    fail();
    render(B, DEFAULT_AVATAR_SRC);
    render(A, DEFAULT_AVATAR_SRC);
    expect(shows(A)).toBe(true);
  });

  it("枠ごと消えたあとでも、URL が変われば再び表示される", () => {
    render(A);
    fail();
    render(B);
    expect(shows(B)).toBe(true);
  });
});
