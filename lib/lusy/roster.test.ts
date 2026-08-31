import { describe, it, expect } from "vitest";
import { buildRoster, resolveDiscordId } from "./roster";
import type { MemberDocument } from "@/lib/members";

function member(overrides: Partial<MemberDocument>): MemberDocument {
  return overrides as MemberDocument;
}

const roster = buildRoster([
  {
    discordId: "discord-alice",
    data: member({ github: "Alice", githubId: "1001" }),
  },
  { discordId: "discord-bob", data: member({ github: "bob" }) },
  {
    discordId: "discord-gone",
    data: member({ github: "gone", githubId: "1003", optedOut: true }),
  },
  {
    discordId: "discord-sub",
    data: member({ github: "subby", githubId: "1004", isSubAccount: true }),
  },
  { discordId: "discord-nogithub", data: member({}) },
]);

describe("buildRoster", () => {
  it("indexes by numeric github id", () => {
    expect(roster.byGithubId.get("1001")?.discordId).toBe("discord-alice");
  });

  it("indexes by lowercased login for members without a numeric id", () => {
    expect(roster.byLogin.get("bob")?.discordId).toBe("discord-bob");
  });

  it("excludes opted-out members", () => {
    expect(roster.byGithubId.has("1003")).toBe(false);
    expect(roster.byLogin.has("gone")).toBe(false);
  });

  it("excludes sub accounts", () => {
    expect(roster.byGithubId.has("1004")).toBe(false);
  });

  it("ignores members with no GitHub link", () => {
    expect(roster.byLogin.size).toBe(2);
  });
});

describe("resolveDiscordId", () => {
  it("prefers the numeric id so a GitHub rename does not break the link", () => {
    // login は変わっているが databaseId は同じ、というのが改名直後の状態
    expect(
      resolveDiscordId(roster, { login: "alice-renamed", databaseId: 1001 }),
    ).toBe("discord-alice");
  });

  it("falls back to login when the numeric id is unknown", () => {
    expect(resolveDiscordId(roster, { login: "bob", databaseId: 9999 })).toBe(
      "discord-bob",
    );
  });

  it("matches login case-insensitively", () => {
    expect(resolveDiscordId(roster, { login: "ALICE", databaseId: null })).toBe(
      "discord-alice",
    );
  });

  it("returns null for an unlinked GitHub user", () => {
    expect(
      resolveDiscordId(roster, { login: "stranger", databaseId: 42 }),
    ).toBeNull();
  });
});
