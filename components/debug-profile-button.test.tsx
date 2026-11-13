import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DebugProfileButton } from "./debug-profile-button";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/debug-profile", () => ({
  registerDebugProfile: vi.fn(),
}));

describe("DebugProfileButton", () => {
  it("explains the local-only shortcut and exposes a registration button", () => {
    const html = renderToStaticMarkup(<DebugProfileButton />);

    expect(html).toContain("開発環境のみ");
    expect(html).toContain("デバッグプロフィールを登録");
    expect(html).toContain("オンボーディングをスキップ");
  });
});
