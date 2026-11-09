import { describe, it, expect } from "vitest";
import {
  parseLevels,
  lastRequestedAt,
  lastActivityAt,
  findStaleReviewers,
  pickReplacement,
  planReassignments,
  reassignComment,
  getAllPages,
  run,
} from "./reassign-reviewers.mjs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-21T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

const LEVELS_JSON = JSON.stringify({
  advanced: ["adv-a", "adv-b"],
  intermediate: ["int-a", "int-b", "int-c"],
  beginner: ["beg-a"],
});

describe("parseLevels", () => {
  it("区分ごとの一覧と login → 区分の対応を作る", () => {
    const { byLevel, levelOf } = parseLevels(LEVELS_JSON);
    expect(byLevel["intermediate"]).toEqual(["int-a", "int-b", "int-c"]);
    expect(levelOf["adv-b"]).toBe("advanced");
  });

  it("login は小文字で引ける", () => {
    const { levelOf } = parseLevels('{"beginner":["Seripro"]}');
    expect(levelOf["seripro"]).toBe("beginner");
  });

  it("未設定・壊れた JSON・形の違う値は例外", () => {
    expect(() => parseLevels(undefined)).toThrow("設定されていません");
    expect(() => parseLevels("")).toThrow("設定されていません");
    expect(() => parseLevels("{")).toThrow();
    expect(() => parseLevels('["a"]')).toThrow("オブジェクト");
    expect(() => parseLevels('{"beginner":"a"}')).toThrow("配列");
    expect(() => parseLevels('{"beginner":[1]}')).toThrow("配列");
  });

  it("advanced / intermediate / beginner 以外のキーは例外 (typo 防止)", () => {
    expect(() => parseLevels('{"Advanced":["a"]}')).toThrow("Advanced");
    expect(() => parseLevels('{"3":["a"]}')).toThrow("3");
  });

  it("一部のキーだけでもよい", () => {
    expect(parseLevels('{"advanced":["a"]}').byLevel).toEqual({
      advanced: ["a"],
    });
  });

  it("同じ人が複数の区分にいたら例外 (大文字小文字違いも)", () => {
    expect(() =>
      parseLevels('{"beginner":["Alice"],"intermediate":["alice"]}'),
    ).toThrow("複数の区分");
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
        requestedLogins: ["int-a"],
        requestedAt: { "int-a": NOW - 3 * DAY },
        activityAt: {},
      }),
    ).toEqual(["int-a"]);
  });

  it("3 日経っていなければ返さない (境界の直前)", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["int-a"],
        requestedAt: { "int-a": NOW - 3 * DAY + 1 },
        activityAt: {},
      }),
    ).toEqual([]);
  });

  it("依頼後にコメントしていれば返さない", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["int-a"],
        requestedAt: { "int-a": NOW - 5 * DAY },
        activityAt: { "int-a": NOW - 4 * DAY },
      }),
    ).toEqual([]);
  });

  it("反応が依頼より前 (再レビュー依頼後は無反応) なら返す", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["int-a"],
        requestedAt: { "int-a": NOW - 4 * DAY },
        activityAt: { "int-a": NOW - 6 * DAY },
      }),
    ).toEqual(["int-a"]);
  });

  it("区分表に無い人・依頼時刻が分からない人には触らない", () => {
    expect(
      findStaleReviewers({
        ...base,
        requestedLogins: ["someone-else", "int-a"],
        requestedAt: { "someone-else": NOW - 10 * DAY },
        activityAt: {},
      }),
    ).toEqual([]);
  });
});

describe("pickReplacement", () => {
  const levels = parseLevels(LEVELS_JSON);

  it("同じ区分から除外対象以外を選ぶ", () => {
    const picked = pickReplacement({
      staleLogin: "int-a",
      ...levels,
      excluded: ["int-a", "int-b"],
    });
    expect(picked).toBe("int-c");
  });

  it("random の値で候補が変わる", () => {
    const args = { staleLogin: "int-a", ...levels, excluded: ["int-a"] };
    expect(pickReplacement({ ...args, random: () => 0 })).toBe("int-b");
    expect(pickReplacement({ ...args, random: () => 0.999 })).toBe("int-c");
  });

  it("除外は大文字小文字を区別しない", () => {
    const picked = pickReplacement({
      staleLogin: "adv-a",
      ...levels,
      excluded: ["ADV-A", "Adv-B"],
    });
    expect(picked).toBeNull();
  });

  it("候補がいなければ null (1 人しかいない区分)", () => {
    expect(
      pickReplacement({ staleLogin: "beg-a", ...levels, excluded: ["beg-a"] }),
    ).toBeNull();
  });

  it("区分表に無い人なら null", () => {
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
        user: { login: "int-b" },
        requested_reviewers: [{ login: "int-a" }],
      },
      timeline: [requested("int-c", 10), requested("int-a", 4)],
      reviews: [],
      issueComments: [],
      reviewComments: [],
      levels,
      now: NOW,
      staleDays: 3,
    });
    // int-b は作成者、int-c は過去に依頼済みなので、intermediate に候補が残らない
    expect(plans).toEqual([{ from: "int-a", to: null }]);
  });

  it("2 人同時に付け替えるとき同じ人を選ばない", () => {
    const plans = planReassignments({
      pr: {
        user: { login: "author" },
        requested_reviewers: [{ login: "int-a" }, { login: "int-b" }],
      },
      timeline: [requested("int-a", 4), requested("int-b", 4)],
      reviews: [],
      issueComments: [],
      reviewComments: [],
      levels,
      now: NOW,
      staleDays: 3,
      random: () => 0,
    });
    expect(plans).toEqual([
      { from: "int-a", to: "int-c" },
      { from: "int-b", to: null },
    ]);
  });

  it("反応していれば何もしない", () => {
    const plans = planReassignments({
      pr: {
        user: { login: "author" },
        requested_reviewers: [{ login: "adv-a" }],
      },
      timeline: [requested("adv-a", 5)],
      reviews: [],
      issueComments: [{ user: { login: "adv-a" }, created_at: daysAgo(1) }],
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
    expect(reassignComment("int-c", 3)).toBe(
      "3日間レビューの動きがなかったため、レビュアーを @int-c さんに交代しました。(自動)",
    );
  });
});

type Call = { method: string; path: string; body?: unknown };

/**
 * GitHub API の偽物。GET はパス (クエリ抜き) ごとに用意した配列を 100 件ずつ返し、
 * 書き込みは記録するだけ。用意していない GET は空配列
 */
function fakeApi(data: Record<string, unknown[]>, failOn?: string) {
  const calls: Call[] = [];
  const request = async (method: string, path: string, body?: unknown) => {
    calls.push({ method, path, body });
    if (failOn && `${method} ${path}` === failOn) {
      throw new Error(`${method} ${path} が失敗しました: 422`);
    }
    if (method !== "GET") return null;
    const url = new URL(path, "https://api.github.test");
    const page = Number(url.searchParams.get("page") ?? "1");
    const all = data[url.pathname] ?? [];
    return all.slice((page - 1) * 100, page * 100);
  };
  const writes = () => calls.filter((c) => c.method !== "GET");
  return { request, calls, writes };
}

describe("getAllPages", () => {
  it("100 件ちょうどのページの次も取りに行き、全件をつなげる", async () => {
    const items = Array.from({ length: 200 }, (_, i) => i);
    const api = fakeApi({ "/pulls": items });
    expect(await getAllPages(api.request, "/pulls?state=open")).toEqual(items);
    // 200 件 = 100 + 100 + 0 件の 3 ページ
    expect(api.calls.map((c) => c.path)).toEqual([
      "/pulls?state=open&per_page=100&page=1",
      "/pulls?state=open&per_page=100&page=2",
      "/pulls?state=open&per_page=100&page=3",
    ]);
  });

  it("クエリの無いパスには ? で付ける", async () => {
    const api = fakeApi({ "/pulls/1/reviews": [{ id: 1 }] });
    expect(await getAllPages(api.request, "/pulls/1/reviews")).toEqual([
      { id: 1 },
    ]);
    expect(api.calls[0].path).toBe("/pulls/1/reviews?per_page=100&page=1");
  });
});

describe("run", () => {
  const levels = parseLevels(LEVELS_JSON);
  const stalePr = (number: number, extra: object = {}) => ({
    number,
    draft: false,
    user: { login: "author" },
    requested_reviewers: [{ login: "adv-a" }],
    ...extra,
  });
  const timelineFor = (login: string, days: number) => [
    {
      event: "review_requested",
      requested_reviewer: { login },
      created_at: daysAgo(days),
    },
  ];
  const base = { levels, staleDays: 3, now: NOW };

  it("追加 → 削除 → コメントの順に書き込む (追加に失敗してもレビュアー 0 人にしないため)", async () => {
    const api = fakeApi({
      "/pulls": [stalePr(7)],
      "/issues/7/timeline": timelineFor("adv-a", 4),
    });
    const summary = await run({ ...base, request: api.request, dryRun: false });
    expect(summary).toEqual(["#7: adv-a → adv-b"]);
    expect(api.writes()).toEqual([
      {
        method: "POST",
        path: "/pulls/7/requested_reviewers",
        body: { reviewers: ["adv-b"] },
      },
      {
        method: "DELETE",
        path: "/pulls/7/requested_reviewers",
        body: { reviewers: ["adv-a"] },
      },
      {
        method: "POST",
        path: "/issues/7/comments",
        body: { body: reassignComment("adv-b", 3) },
      },
    ]);
  });

  it("追加が失敗したら削除もコメントもしない", async () => {
    const api = fakeApi(
      {
        "/pulls": [stalePr(7)],
        "/issues/7/timeline": timelineFor("adv-a", 4),
      },
      "POST /pulls/7/requested_reviewers",
    );
    await expect(
      run({ ...base, request: api.request, dryRun: false }),
    ).rejects.toThrow("422");
    expect(api.writes().map((c) => c.method)).toEqual(["POST"]);
  });

  it("dry run では結果だけ返し、書き込まない", async () => {
    const api = fakeApi({
      "/pulls": [stalePr(7)],
      "/issues/7/timeline": timelineFor("adv-a", 4),
    });
    const summary = await run({ ...base, request: api.request, dryRun: true });
    expect(summary).toEqual(["#7: adv-a → adv-b (dry run)"]);
    expect(api.writes()).toEqual([]);
  });

  it("draft の PR とレビュアー未指名の PR は詳細を取りに行かない", async () => {
    const api = fakeApi({
      "/pulls": [
        stalePr(1, { draft: true }),
        stalePr(2, { requested_reviewers: [] }),
      ],
    });
    const summary = await run({ ...base, request: api.request, dryRun: false });
    expect(summary).toEqual([]);
    expect(api.calls.map((c) => c.path)).toEqual([
      "/pulls?state=open&per_page=100&page=1",
    ]);
  });

  it("代わりがいないときは据え置きと報告し、書き込まない", async () => {
    // beginner は beg-a 1 人だけ
    const api = fakeApi({
      "/pulls": [stalePr(3, { requested_reviewers: [{ login: "beg-a" }] })],
      "/issues/3/timeline": timelineFor("beg-a", 4),
    });
    const summary = await run({ ...base, request: api.request, dryRun: false });
    expect(summary).toEqual([
      "#3: beg-a の代わりになる人が同じ区分にいないため据え置き",
    ]);
    expect(api.writes()).toEqual([]);
  });

  it("101 件目以降の PR も対象にする", async () => {
    const prs = Array.from({ length: 101 }, (_, i) =>
      stalePr(i + 1, { requested_reviewers: [] }),
    );
    prs[100] = stalePr(101);
    const api = fakeApi({
      "/pulls": prs,
      "/issues/101/timeline": timelineFor("adv-a", 4),
    });
    const summary = await run({ ...base, request: api.request, dryRun: true });
    expect(summary).toEqual(["#101: adv-a → adv-b (dry run)"]);
  });

  it("依頼から staleDays 経っていなければ何もしない", async () => {
    const api = fakeApi({
      "/pulls": [stalePr(7)],
      "/issues/7/timeline": timelineFor("adv-a", 2),
    });
    expect(await run({ ...base, request: api.request, dryRun: false })).toEqual(
      [],
    );
    expect(api.writes()).toEqual([]);
  });
});
