import { describe, expect, it } from "vitest";
import { loginErrorView } from "./auth-error";

describe("loginErrorView", () => {
  it("Configuration（PKCE の検証失敗を含む）はもう一度ログインを促す", () => {
    expect(loginErrorView("Configuration").description).toContain(
      "もう一度ログインしてください",
    );
  });

  it("AccessDenied は Discord サーバーへの参加を確認させる", () => {
    expect(loginErrorView("AccessDenied").description).toContain(
      "Discord サーバー",
    );
  });

  it("未知のコード・コードなしは汎用の文言にする", () => {
    const fallback = loginErrorView(undefined).description;
    expect(fallback).toContain("ログインに失敗しました");
    expect(loginErrorView("Verification").description).toBe(fallback);
    expect(loginErrorView("").description).toBe(fallback);
  });

  it("プロトタイプ由来のキーを引かない", () => {
    const fallback = loginErrorView(undefined).description;
    expect(loginErrorView("constructor").description).toBe(fallback);
    expect(loginErrorView("toString").description).toBe(fallback);
  });

  it("同じパラメータが複数あるときは最初の値を使う", () => {
    expect(loginErrorView(["AccessDenied", "Configuration"])).toEqual(
      loginErrorView("AccessDenied"),
    );
  });
});
