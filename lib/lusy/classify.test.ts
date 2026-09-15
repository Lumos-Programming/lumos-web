import { describe, it, expect } from "vitest";
import {
  assignmentsForIssue,
  assignmentsForPullRequest,
  classifyPullRequest,
  dedupeAssignments,
  deriveReviewState,
  isOpenIssue,
} from "./classify";
import type { GitHubUserRef, LusyIssue, LusyPullRequest } from "./types";

const DONE = ["Done", "完了"];

const alice: GitHubUserRef = { login: "alice", databaseId: 1 };
const bob: GitHubUserRef = { login: "bob", databaseId: 2 };

function pr(overrides: Partial<LusyPullRequest> = {}): LusyPullRequest {
  return {
    nodeId: "PR_1",
    repository: "lumos-web",
    number: 100,
    title: "Add OAuth",
    url: "https://github.com/x/y/pull/100",
    author: alice,
    state: "OPEN",
    isDraft: false,
    requestedUsers: [],
    requestedTeams: [],
    reviewDecision: null,
    latestReviews: [],
    projectStatus: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    closedAt: null,
    mergedAt: null,
    ...overrides,
  };
}

function issue(overrides: Partial<LusyIssue> = {}): LusyIssue {
  return {
    nodeId: "I_1",
    repository: "lumos-web",
    number: 42,
    title: "ログイン画面を作る",
    url: "https://github.com/x/y/issues/42",
    state: "OPEN",
    assignees: [alice],
    projectStatus: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    closedAt: null,
    ...overrides,
  };
}

describe("deriveReviewState", () => {
  it("falls back to individual reviews when reviewDecision is null", () => {
    // lumos-web は main が非保護なので reviewDecision は常に null になる。
    // ここが null のまま分類できないと、レビュー待ちが一切検出されない。
    expect(
      deriveReviewState(
        pr({
          reviewDecision: null,
          latestReviews: [{ author: bob, state: "APPROVED" }],
        }),
      ),
    ).toBe("APPROVED");
  });

  it("prioritises CHANGES_REQUESTED over APPROVED", () => {
    expect(
      deriveReviewState(
        pr({
          latestReviews: [
            { author: bob, state: "APPROVED" },
            { author: alice, state: "CHANGES_REQUESTED" },
          ],
        }),
      ),
    ).toBe("CHANGES_REQUESTED");
  });

  it("ignores COMMENTED reviews", () => {
    expect(
      deriveReviewState(
        pr({ latestReviews: [{ author: bob, state: "COMMENTED" }] }),
      ),
    ).toBeNull();
  });

  it("uses reviewDecision when branch protection provides it", () => {
    expect(deriveReviewState(pr({ reviewDecision: "APPROVED" }))).toBe(
      "APPROVED",
    );
  });
});

describe("classifyPullRequest", () => {
  it("classifies a draft PR", () => {
    expect(classifyPullRequest(pr({ isDraft: true }))).toBe("draft");
  });

  it("classifies review_waiting from requested users alone (reviewDecision null)", () => {
    expect(classifyPullRequest(pr({ requestedUsers: [bob] }))).toBe(
      "review_waiting",
    );
  });

  it("classifies review_waiting from a requested team", () => {
    expect(
      classifyPullRequest(
        pr({ requestedTeams: [{ slug: "sys", name: "Sys" }] }),
      ),
    ).toBe("review_waiting");
  });

  it("classifies reviewer_unassigned when ready with nobody requested", () => {
    expect(classifyPullRequest(pr())).toBe("reviewer_unassigned");
  });

  it("puts changes_requested ahead of review_waiting so the author is pinged, not the reviewer", () => {
    expect(
      classifyPullRequest(
        pr({
          requestedUsers: [bob],
          latestReviews: [{ author: bob, state: "CHANGES_REQUESTED" }],
        }),
      ),
    ).toBe("changes_requested");
  });

  it("classifies approved separately from review_waiting", () => {
    expect(
      classifyPullRequest(
        pr({
          requestedUsers: [bob],
          latestReviews: [{ author: bob, state: "APPROVED" }],
        }),
      ),
    ).toBe("approved");
  });

  it("classifies merged and ignores plain closed", () => {
    expect(classifyPullRequest(pr({ state: "MERGED" }))).toBe("merged");
    expect(classifyPullRequest(pr({ state: "CLOSED" }))).toBeNull();
  });

  it("treats draft as draft even when reviewers are requested", () => {
    expect(
      classifyPullRequest(pr({ isDraft: true, requestedUsers: [bob] })),
    ).toBe("draft");
  });
});

describe("isOpenIssue", () => {
  it("treats a Done project status as complete even while OPEN", () => {
    expect(isOpenIssue(issue({ projectStatus: "Done" }), DONE)).toBe(false);
  });

  it("matches done statuses case-insensitively", () => {
    expect(isOpenIssue(issue({ projectStatus: "done" }), DONE)).toBe(false);
  });

  it("keeps an OPEN issue with an in-progress status", () => {
    expect(isOpenIssue(issue({ projectStatus: "In Progress" }), DONE)).toBe(
      true,
    );
  });

  it("excludes CLOSED issues", () => {
    expect(isOpenIssue(issue({ state: "CLOSED" }), DONE)).toBe(false);
  });
});

describe("assignmentsForIssue", () => {
  it("keeps an unassigned issue as an unowned assignment", () => {
    // 無担当の Issue を落とすと「溜まっているチケット」の一番拾いたい層が消える
    const result = assignmentsForIssue(issue({ assignees: [] }), DONE);
    expect(result).toHaveLength(1);
    expect(result[0].user).toBeNull();
    expect(result[0].item.kind).toBe("issue_unassigned");
  });

  it("fans out to every assignee", () => {
    const result = assignmentsForIssue(
      issue({ assignees: [alice, bob] }),
      DONE,
    );
    expect(result.map((r) => r.user?.login)).toEqual(["alice", "bob"]);
    expect(result.every((r) => r.item.kind === "issue_open")).toBe(true);
  });

  it("drops completed issues", () => {
    expect(assignmentsForIssue(issue({ state: "CLOSED" }), DONE)).toEqual([]);
  });
});

describe("assignmentsForPullRequest", () => {
  const noTeams = () => [];

  it("routes draft PRs to the author", () => {
    const result = assignmentsForPullRequest(pr({ isDraft: true }), noTeams);
    expect(result).toHaveLength(1);
    expect(result[0].user?.login).toBe("alice");
    expect(result[0].item.kind).toBe("draft");
  });

  it("routes changes_requested to the author, never the reviewer", () => {
    const result = assignmentsForPullRequest(
      pr({
        requestedUsers: [bob],
        latestReviews: [{ author: bob, state: "CHANGES_REQUESTED" }],
      }),
      noTeams,
    );
    expect(result.map((r) => r.user?.login)).toEqual(["alice"]);
  });

  it("expands a team review request to every member", () => {
    const result = assignmentsForPullRequest(
      pr({ requestedTeams: [{ slug: "sys", name: "SystemDevTeam2025" }] }),
      () => [alice, bob],
    );
    expect(result).toHaveLength(2);
    expect(
      result.every((r) => r.item.viaTeam?.name === "SystemDevTeam2025"),
    ).toBe(true);
  });

  it("still surfaces the PR when the team cannot be expanded", () => {
    const result = assignmentsForPullRequest(
      pr({ requestedTeams: [{ slug: "sys", name: "Sys" }] }),
      () => [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].user).toBeNull();
    expect(result[0].item.kind).toBe("review_waiting");
  });

  it("skips approved PRs in the MVP", () => {
    expect(
      assignmentsForPullRequest(
        pr({ latestReviews: [{ author: bob, state: "APPROVED" }] }),
        noTeams,
      ),
    ).toEqual([]);
  });
});

describe("dedupeAssignments", () => {
  it("prefers a direct request over the same person reached via a team", () => {
    const viaTeam = assignmentsForPullRequest(
      pr({ requestedTeams: [{ slug: "sys", name: "Sys" }] }),
      () => [bob],
    );
    const direct = assignmentsForPullRequest(
      pr({ requestedUsers: [bob] }),
      () => [],
    );

    const result = dedupeAssignments([...viaTeam, ...direct]);
    expect(result).toHaveLength(1);
    expect(result[0].item.viaTeam).toBeUndefined();
  });

  it("keeps the same item for different people", () => {
    const result = dedupeAssignments(
      assignmentsForPullRequest(pr({ requestedUsers: [alice, bob] }), () => []),
    );
    expect(result).toHaveLength(2);
  });
});
