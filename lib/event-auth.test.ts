import { describe, it, expect } from "vitest";
import type { Session } from "next-auth";
import { isEventEditor, isEventParticipant } from "./event-auth";

function session(user: Partial<Session["user"]>): Session {
  return { user: { id: "u1", isAdmin: false, ...user }, expires: "" };
}

describe("isEventEditor", () => {
  it("allows admins", () => {
    expect(isEventEditor(session({ isAdmin: true }))).toBe(true);
  });

  it("rejects non-admins and missing sessions", () => {
    expect(isEventEditor(null)).toBe(false);
    expect(isEventEditor(session({ isAdmin: false }))).toBe(false);
    expect(isEventEditor(session({ id: "", isAdmin: true }))).toBe(false);
  });

  it("rejects opted-out users even if the admin flag lingers in the session", () => {
    expect(isEventEditor(session({ isAdmin: true, optedOut: true }))).toBe(
      false,
    );
  });
});

describe("isEventParticipant", () => {
  it("allows any signed-in member, admin or not", () => {
    expect(isEventParticipant(session({}))).toBe(true);
    expect(isEventParticipant(session({ isAdmin: true }))).toBe(true);
  });

  it("rejects missing sessions and empty IDs", () => {
    expect(isEventParticipant(null)).toBe(false);
    expect(isEventParticipant(session({ id: "" }))).toBe(false);
  });

  it("rejects opted-out members, including admins", () => {
    expect(isEventParticipant(session({ optedOut: true }))).toBe(false);
    expect(isEventParticipant(session({ isAdmin: true, optedOut: true }))).toBe(
      false,
    );
  });
});
