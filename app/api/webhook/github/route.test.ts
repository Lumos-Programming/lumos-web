import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  getMemberIdByGithubId: vi.fn(),
  awardPoints: vi.fn(),
  grantTicket: vi.fn(),
}));
vi.mock("@/lib/lottery", () => ({ grantTicket: mocks.grantTicket }));
vi.mock("@/lib/members", () => ({
  getMemberIdByGithubId: mocks.getMemberIdByGithubId,
}));
vi.mock("@/lib/points", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/points")>()),
  awardPoints: mocks.awardPoints,
}));

const SECRET = "test-secret";
const merged = {
  action: "closed",
  repository: { id: 7, full_name: "Lumos-Programming/lumos-web" },
  pull_request: {
    number: 1,
    title: "t",
    html_url: "https://github.com/x/pull/1",
    merged: true,
    user: { id: 100, type: "User" },
  },
};

function req(
  body: unknown,
  {
    event = "pull_request",
    secret = SECRET,
    signature,
  }: {
    event?: string;
    secret?: string;
    signature?: string;
  } = {},
) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const sig =
    signature ??
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  return new Request("https://example.test/api/webhook/github", {
    method: "POST",
    headers: { "x-github-event": event, "x-hub-signature-256": sig },
    body: raw,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("GITHUB_REWARD_REPOS", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getMemberIdByGithubId.mockResolvedValue("alice");
  mocks.awardPoints.mockResolvedValue({ awarded: true });
  mocks.grantTicket.mockResolvedValue({ granted: true, drawId: "2026-11-13" });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/webhook/github", () => {
  it("returns 503 when the secret is not configured", async () => {
    vi.stubEnv("GITHUB_WEBHOOK_SECRET", "");
    expect((await POST(req(merged))).status).toBe(503);
  });

  it("rejects an invalid signature without side effects", async () => {
    const res = await POST(req(merged, { secret: "wrong" }));
    expect(res.status).toBe(401);
    expect(mocks.awardPoints).not.toHaveBeenCalled();
  });

  it("rejects a signed but non-JSON body", async () => {
    expect((await POST(req("not json"))).status).toBe(400);
  });

  it("awards points to the linked member", async () => {
    const res = await POST(req(merged));
    expect(res.status).toBe(200);
    expect(mocks.getMemberIdByGithubId).toHaveBeenCalledWith(100);
    expect(mocks.awardPoints).toHaveBeenCalledWith({
      key: "github_pr_merged:7:1",
      memberId: "alice",
      reason: "github_pr_merged",
      description: "Lumos-Programming/lumos-web#1 t",
      sourceUrl: "https://github.com/x/pull/1",
    });
    expect((await res.json()).results).toEqual([
      { key: "github_pr_merged:7:1", status: "awarded" },
    ]);
  });

  it("reports duplicates (redelivery) as 200", async () => {
    mocks.awardPoints.mockResolvedValue({ awarded: false });
    const res = await POST(req(merged));
    expect((await res.json()).results[0].status).toBe("duplicate");
  });

  it("ignores GitHub users without a linked member", async () => {
    mocks.getMemberIdByGithubId.mockResolvedValue(null);
    const res = await POST(req(merged));
    expect(res.status).toBe(200);
    expect((await res.json()).results[0].status).toBe("no_member");
    expect(mocks.awardPoints).not.toHaveBeenCalled();
  });

  it("acknowledges ping events", async () => {
    const res = await POST(req({ zen: "hi" }, { event: "ping" }));
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });

  it("respects GITHUB_REWARD_REPOS", async () => {
    vi.stubEnv("GITHUB_REWARD_REPOS", "Lumos-Programming/other");
    await POST(req(merged));
    expect(mocks.awardPoints).not.toHaveBeenCalled();
  });

  it("returns 500 so GitHub can redeliver when Firestore fails", async () => {
    mocks.awardPoints.mockRejectedValue(new Error("down"));
    expect((await POST(req(merged))).status).toBe(500);
  });

  it("grants lottery tickets for issues closed by the merged PR", async () => {
    const payload = {
      ...merged,
      pull_request: { ...merged.pull_request, body: "Closes #3\nFixes #4" },
    };
    const res = await POST(req(payload));
    expect(mocks.grantTicket).toHaveBeenCalledTimes(2);
    expect(mocks.grantTicket).toHaveBeenCalledWith(
      expect.objectContaining({ key: "lottery_ticket:7:3", memberId: "alice" }),
    );
    const statuses = (await res.json()).results.map(
      (r: { status: string }) => r.status,
    );
    expect(statuses).toEqual(["awarded", "granted", "granted"]);
  });

  it("does not grant tickets to unlinked GitHub users", async () => {
    mocks.getMemberIdByGithubId.mockResolvedValue(null);
    const payload = {
      ...merged,
      pull_request: { ...merged.pull_request, body: "Closes #3" },
    };
    await POST(req(payload));
    expect(mocks.grantTicket).not.toHaveBeenCalled();
  });
});
