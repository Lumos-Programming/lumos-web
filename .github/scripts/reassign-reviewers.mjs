// レビュー依頼から一定期間反応が無いレビュアーを、同じレベルの別のメンバーに付け替える。
// レベル表はリポジトリ変数 REVIEWER_LEVELS に JSON で置く (公開リポジトリのためコードには書かない)。
// キーは習熟度 (advanced / intermediate / beginner)。難しい PR ほど advanced の人に振る。
//   例: {"advanced":["alice"],"intermediate":["bob","carol"],"beginner":["dave"]}
// 「反応」はレビューの提出かコメント (PR 本体・コード行のどちらでも)。
// レベル表に載っていないレビュアー (bot や手動で指名した人) には触らない。

const DAY_MS = 24 * 60 * 60 * 1000;
const LEVEL_KEYS = ["advanced", "intermediate", "beginner"];

/** REVIEWER_LEVELS の文字列を { login: level } と { level: logins[] } にする。不正なら例外 */
export function parseLevels(raw) {
  if (!raw) throw new Error("REVIEWER_LEVELS が設定されていません");
  const parsed = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      "REVIEWER_LEVELS はレベルをキーにしたオブジェクトにしてください",
    );
  }
  const byLevel = {};
  const levelOf = {};
  for (const [level, logins] of Object.entries(parsed)) {
    if (!LEVEL_KEYS.includes(level)) {
      throw new Error(
        `REVIEWER_LEVELS のキー "${level}" は ${LEVEL_KEYS.join(" / ")} のどれかにしてください`,
      );
    }
    if (!Array.isArray(logins) || !logins.every((l) => typeof l === "string")) {
      throw new Error(
        `REVIEWER_LEVELS の "${level}" は GitHub ID の配列にしてください`,
      );
    }
    byLevel[level] = logins;
    for (const login of logins) {
      // GitHub の login は大文字小文字を区別しないので、比較は小文字で揃える
      const key = login.toLowerCase();
      if (levelOf[key] !== undefined) {
        throw new Error(`${login} が複数のレベルに入っています`);
      }
      levelOf[key] = level;
    }
  }
  return { byLevel, levelOf };
}

/** 各レビュアーが最後にレビュー依頼された時刻 (ms)。timeline の review_requested から取る */
export function lastRequestedAt(timeline) {
  const result = {};
  for (const event of timeline) {
    if (event.event !== "review_requested" || !event.requested_reviewer)
      continue;
    const login = event.requested_reviewer.login.toLowerCase();
    const at = Date.parse(event.created_at);
    if (!(login in result) || at > result[login]) result[login] = at;
  }
  return result;
}

/** 各ユーザーの最後の反応時刻 (ms)。レビュー・PR コメント・コード行コメントをまとめて見る */
export function lastActivityAt({ reviews, issueComments, reviewComments }) {
  const result = {};
  const record = (user, timestamp) => {
    if (!user || !timestamp) return;
    const login = user.login.toLowerCase();
    const at = Date.parse(timestamp);
    if (!(login in result) || at > result[login]) result[login] = at;
  };
  for (const r of reviews) record(r.user, r.submitted_at);
  for (const c of issueComments) record(c.user, c.created_at);
  for (const c of reviewComments) record(c.user, c.created_at);
  return result;
}

/**
 * 付け替える対象の login (小文字) を返す。
 * 依頼中で、レベル表に載っていて、依頼から staleDays 以上経ち、依頼後に反応が無い人。
 */
export function findStaleReviewers({
  requestedLogins,
  requestedAt,
  activityAt,
  levelOf,
  now,
  staleDays,
}) {
  return requestedLogins
    .map((login) => login.toLowerCase())
    .filter((login) => {
      if (levelOf[login] === undefined) return false;
      const at = requestedAt[login];
      // 依頼時刻が分からないものは判断できないので触らない
      if (at === undefined) return false;
      if (now - at < staleDays * DAY_MS) return false;
      const active = activityAt[login];
      return active === undefined || active < at;
    });
}

/**
 * 同じレベルから代わりの 1 人を選ぶ。候補がいなければ null。
 * 作成者と、この PR で一度でも依頼された人・反応した人は除く
 * (付け替えた相手を後でまた指名し直さないため)。
 */
export function pickReplacement({
  staleLogin,
  byLevel,
  levelOf,
  excluded,
  random = Math.random,
}) {
  const level = levelOf[staleLogin.toLowerCase()];
  if (level === undefined) return null;
  const excludedSet = new Set([...excluded].map((l) => l.toLowerCase()));
  const candidates = byLevel[level].filter(
    (login) => !excludedSet.has(login.toLowerCase()),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(random() * candidates.length)];
}

/** PR 1 件について、誰を誰に付け替えるかを決める。API は呼ばない */
export function planReassignments({
  pr,
  timeline,
  reviews,
  issueComments,
  reviewComments,
  levels,
  now,
  staleDays,
  random = Math.random,
}) {
  const requestedAt = lastRequestedAt(timeline);
  const activityAt = lastActivityAt({ reviews, issueComments, reviewComments });
  const requestedLogins = pr.requested_reviewers.map((u) => u.login);
  const stale = findStaleReviewers({
    requestedLogins,
    requestedAt,
    activityAt,
    levelOf: levels.levelOf,
    now,
    staleDays,
  });

  const excluded = new Set([
    pr.user.login.toLowerCase(),
    ...requestedLogins.map((l) => l.toLowerCase()),
    ...Object.keys(requestedAt),
    ...Object.keys(activityAt),
  ]);
  const plans = [];
  for (const staleLogin of stale) {
    const replacement = pickReplacement({
      staleLogin,
      byLevel: levels.byLevel,
      levelOf: levels.levelOf,
      excluded,
      random,
    });
    // 同じ PR で 2 人同時に付け替えるとき、同じ人を選ばないようにする
    if (replacement) excluded.add(replacement.toLowerCase());
    plans.push({ from: staleLogin, to: replacement });
  }
  return plans;
}

export function reassignComment(to, staleDays) {
  return `${staleDays}日間レビューの動きがなかったため、レビュアーを @${to} さんに交代しました。(自動)`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const staleDays = Number(process.env.STALE_DAYS ?? "3");
  const dryRun = process.env.DRY_RUN === "true";
  const levels = parseLevels(process.env.REVIEWER_LEVELS);
  const api = `https://api.github.com/repos/${repo}`;

  async function request(method, path, body) {
    const res = await fetch(`${api}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new Error(
        `${method} ${path} が失敗しました: ${res.status} ${await res.text()}`,
      );
    }
    return res.status === 204 ? null : res.json();
  }

  async function getAll(path) {
    const items = [];
    for (let page = 1; ; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const batch = await request(
        "GET",
        `${path}${sep}per_page=100&page=${page}`,
      );
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  }

  const summary = [];
  const prs = await getAll("/pulls?state=open");
  for (const pr of prs) {
    if (pr.draft || pr.requested_reviewers.length === 0) continue;
    const [timeline, reviews, issueComments, reviewComments] =
      await Promise.all([
        getAll(`/issues/${pr.number}/timeline`),
        getAll(`/pulls/${pr.number}/reviews`),
        getAll(`/issues/${pr.number}/comments`),
        getAll(`/pulls/${pr.number}/comments`),
      ]);
    const plans = planReassignments({
      pr,
      timeline,
      reviews,
      issueComments,
      reviewComments,
      levels,
      now: Date.now(),
      staleDays,
    });

    for (const { from, to } of plans) {
      if (!to) {
        summary.push(
          `#${pr.number}: ${from} の代わりになる人が同じレベルにいないため据え置き`,
        );
        continue;
      }
      summary.push(
        `#${pr.number}: ${from} → ${to}${dryRun ? " (dry run)" : ""}`,
      );
      if (dryRun) continue;
      // 先に追加してから外す。追加に失敗したときにレビュアー 0 人の PR を作らないため
      await request("POST", `/pulls/${pr.number}/requested_reviewers`, {
        reviewers: [to],
      });
      await request("DELETE", `/pulls/${pr.number}/requested_reviewers`, {
        reviewers: [from],
      });
      await request("POST", `/issues/${pr.number}/comments`, {
        body: reassignComment(to, staleDays),
      });
    }
  }

  const text = summary.length
    ? summary.join("\n")
    : "付け替え対象はありませんでした";
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## レビュアー付け替え\n\n${text}\n`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
