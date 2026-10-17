import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import { isNewsEditor } from "./news-auth";

function session(user: Partial<Session["user"]>): Session {
  return { user: { id: "u1", isAdmin: false, ...user }, expires: "" };
}

describe("isNewsEditor", () => {
  it("allows admins", () => {
    expect(isNewsEditor(session({ isAdmin: true }))).toBe(true);
  });

  it("rejects non-admins and missing sessions", () => {
    expect(isNewsEditor(null)).toBe(false);
    expect(isNewsEditor(session({ isAdmin: false }))).toBe(false);
    expect(isNewsEditor(session({ id: "", isAdmin: true }))).toBe(false);
  });

  it("rejects opted-out users even if the admin flag lingers in the session", () => {
    expect(isNewsEditor(session({ isAdmin: true, optedOut: true }))).toBe(
      false,
    );
  });
});
