import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import {
  attachGithubContributions,
  fetchGithubContributions,
  listGithubContributions,
  pickContributionsFor,
  refreshSingleMemberGithubContributions,
  saveGithubContributions,
} from "./github-contributions";
import type { Member } from "@/types/member";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

const db = firebaseAdmin.firestore();

/** GraphQL の返りを組み立てる。weeks は [日ごとの count] の配列 */
function calendarResponse(
  login: string,
  startDate: string,
  weeks: number[][],
): Response {
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const levelOf = (n: number) =>
    [
      "NONE",
      "FIRST_QUARTILE",
      "SECOND_QUARTILE",
      "THIRD_QUARTILE",
      "FOURTH_QUARTILE",
    ][Math.min(n, 4)];
  const body = {
    data: {
      user: {
        login,
        contributionsCollection: {
          contributionCalendar: {
            totalContributions: weeks.flat().reduce((a, b) => a + b, 0),
            weeks: weeks.map((days) => ({
              contributionDays: days.map((count) => {
                const date = cursor.toISOString().slice(0, 10);
                cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
                return {
                  date,
                  contributionCount: count,
                  contributionLevel: levelOf(count),
                };
              }),
            })),
          },
        },
      },
    },
  };
  return new Response(JSON.stringify(body), { status: 200 });
}

function notFoundResponse(): Response {
  return new Response(
    JSON.stringify({
      data: { user: null },
      errors: [{ type: "NOT_FOUND", message: "Could not resolve to a User" }],
    }),
    { status: 200 },
  );
}

describe("github-contributions", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    const docs = await db.collection("github_contributions").listDocuments();
    for (const doc of docs) await doc.delete();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe("fetchGithubContributions", () => {
    it("flattens the calendar into day arrays", async () => {
      // 2026-09-08 は火曜なので最初の週は 5 日分
      fetchMock.mockResolvedValueOnce(
        calendarResponse("Octocat", "2026-09-08", [
          [0, 1, 0, 2, 0],
          [0, 0, 5, 0, 0, 0, 1],
        ]),
      );

      const result = await fetchGithubContributions(
        "octocat",
        new Date("2026-09-20T00:00:00Z"),
      );
      expect(result).toEqual({
        login: "Octocat",
        total: 9,
        startDate: "2026-09-08",
        counts: [0, 1, 0, 2, 0, 0, 0, 5, 0, 0, 0, 1],
        levels: [0, 1, 0, 2, 0, 0, 0, 4, 0, 0, 0, 1],
        fetchedAt: "2026-09-20T00:00:00.000Z",
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://api.github.com/graphql");
      expect(init.headers.Authorization).toBe("Bearer test-token");
      expect(JSON.parse(init.body).variables).toEqual({ login: "octocat" });
    });

    it("returns null when the user does not exist", async () => {
      fetchMock.mockResolvedValueOnce(notFoundResponse());
      expect(await fetchGithubContributions("nobody")).toBeNull();
    });

    it("throws on HTTP errors and other GraphQL errors", async () => {
      fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
      await expect(fetchGithubContributions("x")).rejects.toThrow("401");

      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ errors: [{ message: "rate limited" }] }),
          { status: 200 },
        ),
      );
      await expect(fetchGithubContributions("x")).rejects.toThrow(
        "rate limited",
      );
    });

    it("throws when GITHUB_TOKEN is missing", async () => {
      vi.stubEnv("GITHUB_TOKEN", "");
      await expect(fetchGithubContributions("x")).rejects.toThrow(
        "GITHUB_TOKEN",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("refreshSingleMemberGithubContributions", () => {
    it("saves the calendar and lists it back", async () => {
      fetchMock.mockResolvedValueOnce(
        calendarResponse("Octocat", "2026-09-06", [[1, 0, 0, 0, 0, 0, 2]]),
      );

      const result = await refreshSingleMemberGithubContributions({
        discordId: "d1",
        github: "octocat",
      });
      expect(result).toEqual({ status: "updated", discordId: "d1" });

      const all = await listGithubContributions();
      const saved = all.get("d1");
      expect(saved?.login).toBe("Octocat");
      expect(saved?.total).toBe(3);
      expect(saved?.counts).toEqual([1, 0, 0, 0, 0, 0, 2]);
      expect(saved?.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("removes stale data and skips when the user disappeared", async () => {
      await saveGithubContributions("d1", {
        login: "gone",
        total: 1,
        startDate: "2026-09-06",
        counts: [1],
        levels: [1],
        fetchedAt: "2026-09-01T00:00:00.000Z",
      });
      fetchMock.mockResolvedValueOnce(notFoundResponse());

      const result = await refreshSingleMemberGithubContributions({
        discordId: "d1",
        github: "gone",
      });
      expect(result).toEqual({
        status: "skipped",
        discordId: "d1",
        reason: "user not found",
      });
      expect((await listGithubContributions()).has("d1")).toBe(false);
    });

    it("reports failures without throwing", async () => {
      fetchMock.mockRejectedValueOnce(new Error("network down"));
      const result = await refreshSingleMemberGithubContributions({
        discordId: "d1",
        github: "octocat",
      });
      expect(result).toEqual({
        status: "failed",
        discordId: "d1",
        error: "network down",
      });
    });
  });

  describe("attachGithubContributions", () => {
    const base = (id: string, github?: string): Member => ({
      id,
      name: id,
      role: "",
      department: "",
      year: "",
      bio: "",
      publicImage: "",
      social: github ? { github: `https://github.com/${github}` } : undefined,
    });
    const calendar = {
      login: "Octocat",
      total: 1,
      startDate: "2026-09-06",
      counts: [1],
      levels: [1],
      fetchedAt: "2026-09-01T00:00:00.000Z",
    };

    it("matches by login case-insensitively and hides others", () => {
      expect(pickContributionsFor("https://github.com/octocat", calendar)).toBe(
        calendar,
      );
      // 別アカウントに繋ぎ直した人には古い草を出さない
      expect(
        pickContributionsFor("https://github.com/someone-else", calendar),
      ).toBeUndefined();
      // 公開範囲で github が隠れている人には出さない
      expect(pickContributionsFor(undefined, calendar)).toBeUndefined();
    });

    it("attaches only to members whose github is visible", async () => {
      await saveGithubContributions("visible", calendar);
      await saveGithubContributions("hidden", calendar);

      const members = await attachGithubContributions([
        base("visible", "octocat"),
        base("hidden"),
        base("nodata", "octocat"),
      ]);
      expect(members[0].githubContributions?.total).toBe(1);
      expect(members[1].githubContributions).toBeUndefined();
      expect(members[2].githubContributions).toBeUndefined();
    });

    it("skips the Firestore read when nobody shows github", async () => {
      const members = await attachGithubContributions([base("a"), base("b")]);
      expect(members.every((m) => m.githubContributions === undefined)).toBe(
        true,
      );
    });
  });
});
