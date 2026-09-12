import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";
import type { Member } from "@/types/member";
import {
  CONTRIBUTION_LEVELS,
  type GithubContributions,
} from "@/types/github-contributions";

const COLLECTION = "github_contributions";
const GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

/**
 * プロフィールの草と同じデータを返すクエリ。期間を省略すると直近 1 年になる。
 * contributionLevel は GitHub 自身が色分けに使う 5 段階。
 */
const CALENDAR_QUERY = `
query($login: String!) {
  user(login: $login) {
    login
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}`;

interface CalendarDay {
  date: string;
  contributionCount: number;
  contributionLevel: string;
}

interface GraphqlResponse {
  data?: {
    user: {
      login: string;
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: CalendarDay[] }[];
        };
      };
    } | null;
  };
  errors?: { type?: string; message: string }[];
}

/** GITHUB_TOKEN が未設定なら草の取得は丸ごとスキップする (他のバッチは動かす) */
export function isGithubContributionsEnabled(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

/**
 * GitHub GraphQL API から 1 年分の草を取る。
 * ユーザーが見つからなければ null。それ以外の失敗は例外。
 *
 * どのトークンでも公開分は取れる。本人が GitHub 側で
 * "Include private contributions" を有効にしていれば非公開分も数に入る。
 */
export async function fetchGithubContributions(
  login: string,
  now: Date = new Date(),
): Promise<GithubContributions | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "lumos-web",
    },
    body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login } }),
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL responded ${res.status}`);
  }

  const json = (await res.json()) as GraphqlResponse;
  // ユーザー不在は errors に NOT_FOUND で返り、data.user は null になる
  if (!json.data?.user) {
    if (json.errors?.some((e) => e.type === "NOT_FOUND")) return null;
    throw new Error(
      `GitHub GraphQL error: ${json.errors?.map((e) => e.message).join(", ") ?? "empty response"}`,
    );
  }

  const { user } = json.data;
  const days = user.contributionsCollection.contributionCalendar.weeks.flatMap(
    (w) => w.contributionDays,
  );
  if (days.length === 0) return null;

  return {
    login: user.login,
    total: user.contributionsCollection.contributionCalendar.totalContributions,
    startDate: days[0].date,
    counts: days.map((d) => d.contributionCount),
    levels: days.map((d) => CONTRIBUTION_LEVELS[d.contributionLevel] ?? 0),
    fetchedAt: now.toISOString(),
  };
}

function toContributions(
  data: FirebaseFirestore.DocumentData,
): GithubContributions {
  return {
    login: data.login,
    total: data.total,
    startDate: data.startDate,
    counts: data.counts,
    levels: data.levels,
    fetchedAt:
      data.fetchedAt instanceof Timestamp
        ? data.fetchedAt.toDate().toISOString()
        : "",
  };
}

/** 全メンバー分をまとめて読む。一覧ページで 1 回だけ呼ぶ */
export async function listGithubContributions(): Promise<
  Map<string, GithubContributions>
> {
  const snap = await getDb().collection(COLLECTION).get();
  return new Map(snap.docs.map((doc) => [doc.id, toContributions(doc.data())]));
}

export async function saveGithubContributions(
  discordId: string,
  contributions: GithubContributions,
): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(discordId)
    .set({
      ...contributions,
      fetchedAt: Timestamp.fromDate(new Date(contributions.fetchedAt)),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteGithubContributions(
  discordId: string,
): Promise<void> {
  await getDb().collection(COLLECTION).doc(discordId).delete();
}

/** 草の定期更新バッチが扱うメンバー情報 */
export interface GithubContributionsMember {
  discordId: string;
  github: string;
}

export type RefreshGithubContributionsResult =
  | { status: "updated"; discordId: string }
  | { status: "skipped"; discordId: string; reason: string }
  | { status: "failed"; discordId: string; error: string };

/**
 * 1 メンバー分の草を取り直して保存する。
 * GitHub 側でユーザーが消えていたら保存済みの草も消してスキップ扱いにする。
 */
export async function refreshSingleMemberGithubContributions(
  member: GithubContributionsMember,
): Promise<RefreshGithubContributionsResult> {
  const { discordId } = member;
  try {
    const contributions = await fetchGithubContributions(member.github);
    if (contributions === null) {
      await deleteGithubContributions(discordId);
      return { status: "skipped", discordId, reason: "user not found" };
    }
    await saveGithubContributions(discordId, contributions);
    return { status: "updated", discordId };
  } catch (e) {
    return {
      status: "failed",
      discordId,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * 一覧に出すための照合。GitHub を外した人や別アカウントに繋ぎ直した人には
 * 古い草を出さない (social.github は visibility を通った URL なので、それが無ければ出さない)。
 */
export function pickContributionsFor(
  githubUrl: string | undefined,
  contributions: GithubContributions | undefined,
): GithubContributions | undefined {
  if (!githubUrl || !contributions) return undefined;
  const login = githubUrl.replace(/^https:\/\/github\.com\//, "");
  return login.toLowerCase() === contributions.login.toLowerCase()
    ? contributions
    : undefined;
}

/**
 * 一覧の各メンバーに草を付ける。social.github は公開範囲を通ったものだけ入っているので、
 * それを鍵にすれば公開してよい人にだけ付く。
 */
export async function attachGithubContributions(
  members: Member[],
): Promise<Member[]> {
  if (!members.some((m) => m.social?.github)) return members;
  const all = await listGithubContributions();
  return members.map((m) => {
    const contributions = pickContributionsFor(m.social?.github, all.get(m.id));
    return contributions ? { ...m, githubContributions: contributions } : m;
  });
}
