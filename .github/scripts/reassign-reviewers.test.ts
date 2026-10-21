import { describe, it, expect } from "vitest";
import {
  parseLevels,
  lastRequestedAt,
  lastActivityAt,
  findStaleReviewers,
  pickReplacement,
  planReassignments,
  reassignComment,
} from "./reassign-reviewers.mjs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-21T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

const LEVELS_JSON = JSON.stringify({
  "3": ["lv3-a", "lv3-b"],
  "2": ["lv2-a", "lv2-b", "lv2-c"],
  "1": ["lv1-a"],
});

describe("parseLevels", () => {
  it("レベルごとの一覧と login → レベルの対応を作る", () => {
    const { byLevel, levelOf } = parseLevels(LEVELS_JSON);
    expect(byLevel["2"]).toEqual(["lv2-a", "lv2-b", "lv2-c"]);
    expect(levelOf["lv3-b"]).toBe("3");
  });

  it("login は小文字で引ける", () => {
    const { levelOf } = parseLevels('{"1":["Seripro"]}');
    expect(levelOf["seripro"]).toBe("1");
  });

  it("未設定・壊れた JSON・形の違う値は例外", () => {
    expect(() => parseLevels(undefined)).toThrow("設定されていません");
    expect(() => parseLevels("")).toThrow("設定されていません");
    expect(() => parseLevels("{")).toThrow();
    expect(() => parseLevels('["a"]')).toThrow("オブジェクト");
    expect(() => parseLevels('{"1":"a"}')).toThrow("配列");
    expect(() => parseLevels('{"1":[1]}')).toThrow("配列");
  });

  it("同じ人が複数レベルにいたら例外 (大文字小文字違いも)", () => {
    expect(() => parseLevels('{"1":["Alice"],"2":["alice"]}')).toThrow(
      "複数のレベル",
    );
  });
});

describe("lastRequestedAt", () => {
  it("同じ人が複数回依頼されたら最後の時刻を取る", () => {
    const result = lastRequestedAt([
      {
        event: "review_requested",
        requested_reviewer: { login: "A" },
        created_at: daysAgo(5),
      },
      {
        event: "review_requested",
        requested_reviewer: { login: "a" },
        created_at: daysAgo(1),
      },
      { event: "commented", created_at: daysAgo(0) },
      // チームへの依頼は requested_reviewer が無い
      {
        event: "review_requested",
        requested_team: { slug: "t" },
        created_at: daysAgo(0),
      },
    ]);
    expect(result).toEqual({ a: NOW - 1 * DAY });
  });
});

describe("lastActivityAt", () => {
  it("レビュー・PR コメント・コード行コメントの最新を取る", () => {
    const result = lastActivityAt({
      reviews: [{ user: { login: "A" }, submitted_at: daysAgo(3) }],
      issueComments: [{ user: { login: "a" }, created_at: daysAgo(1) }],
      reviewComments: [{ user: { login: "B" }, created_at: daysAgo(2) }],
    });
    expect(result).toEqual({ a: NOW - 1 * DAY, b: NOW - 2 * DAY });
  });

  it("退会ユーザー (user が null) や未提出のレビューは無視する", () => {
    const result = lastActivityAt({
      reviews: [{ user: { login: "a" }, submitted_at: null }],
      issueComments: [{ user: null, created_at: daysAgo(1) }],
      reviewComments: [],
    });
    expect(result).toEqual({});
  });
});

describe("findStaleReviewers", () => {
  const { levelOf } = parseLevels(LEVELS_JSON);
  const base = { levelOf, now: NOW, staleDays: 3 };

  it("3 日以上反応が無い人を返す", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["lv2-a"],
        requestedAt: { "lv2-a": NOW - 3 * DAY },
        activityAt: {},
      }),
    ).toEqual(["lv2-a"]);
  });

  it("3 日経っていなければ返さない (境界の直前)", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["lv2-a"],
        requestedAt: { "lv2-a": NOW - 3 * DAY + 1 },
        activityAt: {},
      }),
    ).toEqual([]);
  });

  it("依頼後にコメントしていれば返さない", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["lv2-a"],
        requestedAt: { "lv2-a": NOW - 5 * DAY },
        activityAt: { "lv2-a": NOW - 4 * DAY },
      }),
    ).toEqual([]);
  });

  it("反応が依頼より前 (再レビュー依頼後は無反応) なら返す", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["lv2-a"],
        requestedAt: { "lv2-a": NOW - 4 * DAY },
        activityAt: { "lv2-a": NOW - 6 * DAY },
      }),
    ).toEqual(["lv2-a"]);
  });

  it("レベル表に無い人・依頼時刻が分からない人には触らない", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["someone-else", "lv2-a"],
        requestedAt: { "someone-else": NOW - 10 * DAY },
        activityAt: {},
      }),
    ).toEqual([]);
  });
});

describe("pickReplacement", () => {
  const levels = parseLevels(LEVELS_JSON);

  it("同じレベルから除外対象以外を選ぶ", () => {
    const picked = pickReplacement({
      staleLogin: "lv2-a",
      ...levels,
      excluded: ["lv2-a", "lv2-b"],
    });
    expect(picked).toBe("lv2-c");
  });

  it("random の値で候補が変わる", () => {
    const args = { staleLogin: "lv2-a", ...levels, excluded: ["lv2-a"] };
    expect(pickReplacement({ ...args, random: () => 0 })).toBe("lv2-b");
    expect(pickReplacement({ ...args, random: () => 0.999 })).toBe("lv2-c");
  });

  it("除外は大文字小文字を区別しない", () => {
    const picked = pickReplacement({
      staleLogin: "lv3-a",
      ...levels,
      excluded: ["LV3-A", "Lv3-B"],
    });
    expect(picked).toBeNull();
  });

  it("候補がいなければ null (1 人しかいないレベル)", () => {
    expect(
      pickReplacement({ staleLogin: "lv1-a", ...levels, excluded: ["lv1-a"] }),
    ).toBeNull();
  });

  it("レベル表に無い人なら null", () => {
    expect(
      pickReplacement({ staleLogin: "unknown", ...levels, excluded: [] }),
    ).toBeNull();
  });
});

describe("planReassignments", () => {
  const levels = parseLevels(LEVELS_JSON);
  const requested = (login: string, days: number) => ({
    event: "review_requested",
    requested_reviewer: { login },
    created_at: daysAgo(days),
  });

  it("作成者・過去に依頼した人・反応した人を除いて選ぶ", () => {
    const plans = planReassignments({
      pr: {
        user: { login: "lv2-b" },
        requested_reviewers: [{ login: "lv2-a" }],
      },
      timeline: [requested("lv2-c", 10), requested("lv2-a", 4)],
      reviews: [],
      issueComments: [],
      reviewComments: [],
      levels,
      now: NOW,
      staleDays: 3,
    });
    // lv2-b は作成者、lv2-c は過去に依頼済みなので、Lv2 に候補が残らない
    expect(plans).toEqual([{ from: "lv2-a", to: null }]);
  });

  it("2 人同時に付け替えるとき同じ人を選ばない", () => {
    const plans = planReassignments({
      pr: {
        user: { login: "author" },
        requested_reviewers: [{ login: "lv2-a" }, { login: "lv2-b" }],
      },
      timeline: [requested("lv2-a", 4), requested("lv2-b", 4)],
      reviews: [],
      issueComments: [],
      reviewComments: [],
      levels,
      now: NOW,
      staleDays: 3,
      random: () => 0,
    });
    expect(plans).toEqual([
      { from: "lv2-a", to: "lv2-c" },
      { from: "lv2-b", to: null },
    ]);
  });

  it("反応していれば何もしない", () => {
    const plans = planReassignments({
      pr: {
        user: { login: "author" },
        requested_reviewers: [{ login: "lv3-a" }],
      },
      timeline: [requested("lv3-a", 5)],
      reviews: [],
      issueComments: [{ user: { login: "lv3-a" }, created_at: daysAgo(1) }],
      reviewComments: [],
      levels,
      now: NOW,
      staleDays: 3,
    });
    expect(plans).toEqual([]);
  });
});

describe("reassignComment", () => {
  it("交代先をメンションし、元の人の名前は出さない", () => {
    expect(reassignComment("lv2-c", 3)).toBe(
      "3日間レビューの動きがなかったため、レビュアーを @lv2-c さんに交代しました。(自動)",
    );
  });
});
