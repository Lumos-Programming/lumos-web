import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/internal/settings",
}));

import { LoginButton } from "./login-button";

describe("LoginButton", () => {
  it("PKCE login starts through a native anchor with the current page as callback", () => {
    const element = LoginButton() as ReactElement<{ href: string }>;

    expect(element.type).toBe("a");
    expect(element.props.href).toBe(
      "/login?callbackUrl=%2Finternal%2Fsettings",
    );
  });
});
