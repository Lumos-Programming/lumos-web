import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import { isAdminSession } from "./admin-api-auth";

function session(user: Partial<Session["user"]>): Session {
  return { user: { id: "u1", isAdmin: false, ...user }, expires: "" };
}

describe("isAdminSession", () => {
  it("allows admins", () => {
    expect(isAdminSession(session({ isAdmin: true }))).toBe(true);
  });

  it("rejects non-admins and missing sessions", () => {
    expect(isAdminSession(null)).toBe(false);
    expect(isAdminSession(session({ isAdmin: false }))).toBe(false);
    expect(isAdminSession(session({ id: "", isAdmin: true }))).toBe(false);
  });

  it("rejects opted-out users even if the admin flag lingers in the session", () => {
    expect(isAdminSession(session({ isAdmin: true, optedOut: true }))).toBe(
      false,
    );
  });
});
