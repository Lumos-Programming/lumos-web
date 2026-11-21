import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_REWARD_REPOS,
  closingIssueNumbers,
  rewardRepos,
  rewardsForGithubEvent,
  ticketsForGithubEvent,
  verifyGithubSignature,
} from "./github-rewards";

const sign = (body: string, secret: string) =>
  "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

describe("verifyGithubSignature", () => {
  const body = '{"a":1}';
  it("accepts a valid signature", () => {
    expect(verifyGithubSignature(body, sign(body, "s"), "s")).toBe(true);
  });
  it.each([
    ["wrong secret", sign(body, "other")],
    ["tampered body", sign('{"a":2}', "s")],
    ["missing header", null],
    ["no prefix", sign(body, "s").slice("sha256=".length)],
    ["sha1 prefix", "sha1=" + sign(body, "s").slice(7)],
    ["truncated", sign(body, "s").slice(0, 20)],
    ["non-hex", "sha256=zzzz"],
  ])("rejects %s", (_name, header) => {
    expect(verifyGithubSignature(body, header, "s")).toBe(false);
  });
});

describe("rewardRepos", () => {
  it("defaults to lumos-web", () => {
    expect(rewardRepos(undefined)).toEqual(DEFAULT_REWARD_REPOS);
    expect(rewardRepos(" , ")).toEqual(DEFAULT_REWARD_REPOS);
  });
  it("parses a comma-separated list", () => {
    expect(rewardRepos("a/b, c/d")).toEqual(["a/b", "c/d"]);
  });
});

const REPOS = ["Lumos-Programming/lumos-web"];
const author = { id: 100, type: "User" };
const reviewer = { id: 200, type: "User" };

function prPayload(over: Record<string, unknown> = {}, prOver = {}) {
  return {
    action: "closed",
    repository: { id: 7, full_name: "Lumos-Programming/lumos-web" },
    pull_request: {
      number: 42,
      title: "機能追加",
      html_url: "https://github.com/x/pull/42",
      merged: true,
      user: author,
      ...prOver,
    },
    ...over,
  };
}

function reviewPayload(reviewOver = {}, prOver = {}) {
  return prPayload(
    {
      action: "submitted",
      review: {
        state: "approved",
        user: reviewer,
        html_url: "https://github.com/x/pull/42#review",
        ...reviewOver,
      },
    },
    prOver,
  );
}

describe("rewardsForGithubEvent: pull_request", () => {
  it("rewards the author of a merged PR", () => {
    expect(rewardsForGithubEvent("pull_request", prPayload(), REPOS)).toEqual([
      {
        githubUserId: 100,
        key: "github_pr_merged:7:42",
        reason: "github_pr_merged",
        description: "Lumos-Programming/lumos-web#42 機能追加",
        sourceUrl: "https://github.com/x/pull/42",
      },
    ]);
  });

  it("matches the repository name case-insensitively", () => {
    const payload = prPayload({
      repository: { id: 7, full_name: "lumos-programming/LUMOS-WEB" },
    });
    expect(rewardsForGithubEvent("pull_request", payload, REPOS)).toHaveLength(
      1,
    );
  });

  it.each([
    ["closed without merge", prPayload({}, { merged: false })],
    ["opened", prPayload({ action: "opened" })],
    ["bot author", prPayload({}, { user: { id: 1, type: "Bot" } })],
    [
      "another repository",
      prPayload({
        repository: { id: 8, full_name: "Lumos-Programming/other" },
      }),
    ],
  ])("ignores %s", (_name, payload) => {
    expect(rewardsForGithubEvent("pull_request", payload, REPOS)).toEqual([]);
  });
});

describe("rewardsForGithubEvent: pull_request_review", () => {
  it("rewards an approving reviewer once per PR", () => {
    const [reward] = rewardsForGithubEvent(
      "pull_request_review",
      reviewPayload(),
      REPOS,
    );
    expect(reward).toMatchObject({
      githubUserId: 200,
      key: "github_review_approved:7:42:200",
      reason: "github_review_approved",
      sourceUrl: "https://github.com/x/pull/42#review",
    });
  });

  it("accepts the upper-case state", () => {
    expect(
      rewardsForGithubEvent(
        "pull_request_review",
        reviewPayload({ state: "APPROVED" }),
        REPOS,
      ),
    ).toHaveLength(1);
  });

  it.each([
    ["commented", reviewPayload({ state: "commented" })],
    ["changes requested", reviewPayload({ state: "changes_requested" })],
    ["self review", reviewPayload({ user: author })],
    ["bot reviewer", reviewPayload({ user: { id: 3, type: "Bot" } })],
    ["dismissed", { ...reviewPayload(), action: "dismissed" }],
  ])("ignores %s", (_name, payload) => {
    expect(
      rewardsForGithubEvent("pull_request_review", payload, REPOS),
    ).toEqual([]);
  });
});

describe("rewardsForGithubEvent: other inputs", () => {
  it.each([
    ["ping", "ping", { zen: "hi", hook_id: 1 }],
    ["issues", "issues", prPayload()],
    ["missing header", null, prPayload()],
    ["null payload", "pull_request", null],
    ["string payload", "pull_request", "x"],
  ])("ignores %s", (_name, event, payload) => {
    expect(rewardsForGithubEvent(event, payload, REPOS)).toEqual([]);
  });
});

describe("closingIssueNumbers", () => {
  const repo = "Lumos-Programming/lumos-web";
  it.each([
    ["Closes #12", [12]],
    ["closes #12", [12]],
    ["Fix #1, fixes #2 and resolved #3", [1, 2, 3]],
    ["Close: #4", [4]],
    ["Closes Lumos-Programming/lumos-web#5", [5]],
    ["Closes https://github.com/Lumos-Programming/lumos-web/issues/6", [6]],
    ["Closes #7\nCloses #7", [7]],
    ["Closes #9 Closes #8", [8, 9]],
  ])("%j → %j", (body, expected) => {
    expect(closingIssueNumbers(body, repo)).toEqual(expected);
  });

  it.each([
    ["no keyword", "Refs #12"],
    ["keyword without number", "Closes the issue"],
    ["other repository", "Closes Lumos-Programming/other#5"],
    ["other repository URL", "Closes https://github.com/x/y/issues/6"],
    ["word containing a keyword", "prefix #3"],
    ["empty", ""],
  ])("ignores %s", (_name, body) => {
    expect(closingIssueNumbers(body, repo)).toEqual([]);
  });

  it("handles null bodies", () => {
    expect(closingIssueNumbers(null, repo)).toEqual([]);
  });
});

describe("ticketsForGithubEvent", () => {
  const withBody = (body: string | null, over = {}, prOver = {}) =>
    prPayload(over, { body, ...prOver });

  it("gives one ticket per closed issue to the PR author", () => {
    expect(
      ticketsForGithubEvent(
        "pull_request",
        withBody("Closes #3, fixes #4"),
        REPOS,
      ),
    ).toEqual([
      {
        githubUserId: 100,
        key: "lottery_ticket:7:3",
        description: "Lumos-Programming/lumos-web#3 を解決 (PR #42)",
        sourceUrl: "https://github.com/x/pull/42",
      },
      expect.objectContaining({ key: "lottery_ticket:7:4" }),
    ]);
  });

  it.each([
    ["no closing keyword", "pull_request", withBody("Refs #3")],
    ["unmerged", "pull_request", withBody("Closes #3", {}, { merged: false })],
    [
      "bot author",
      "pull_request",
      withBody("Closes #3", {}, { user: { id: 1, type: "Bot" } }),
    ],
    [
      "other repository",
      "pull_request",
      withBody("Closes #3", {
        repository: { id: 8, full_name: "Lumos-Programming/other" },
      }),
    ],
    ["review event", "pull_request_review", withBody("Closes #3")],
    ["null body", "pull_request", withBody(null)],
  ])("gives nothing for %s", (_name, event, payload) => {
    expect(ticketsForGithubEvent(event, payload, REPOS)).toEqual([]);
  });
});
