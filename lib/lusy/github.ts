/**
 * GitHub App による read-only アクセス。
 *
 * Projects V2 は GraphQL でしか読めず `read:project` 相当の権限が要る。個人 PAT だと
 * 所有者依存かつ期限切れリスクがあるため、GitHub App の Installation Token を使う。
 * 依存を増やさないよう JWT は node:crypto で自前に署名する (RS256)。
 *
 * 必要な権限 (すべて Read):
 *   Repository: Issues / Pull requests / Metadata
 *   Organization: Projects, Members  ← Members はチーム展開に必要
 */

import { createSign } from "crypto";
import type {
  GitHubTeamRef,
  GitHubUserRef,
  LusyIssue,
  LusyPullRequest,
  ReviewState,
} from "./types";

const GITHUB_API = "https://api.github.com";
const GRAPHQL_API = "https://api.github.com/graphql";
const USER_AGENT = "lumos-web-lusy-reminder";

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * GitHub App の認証用 JWT を作る。有効期限は最大 10 分。
 * 秘密鍵は環境変数で `\n` がエスケープされて入ることがあるため復元する
 * (lib/firebase.ts の FIREBASE_PRIVATE_KEY と同じ扱い)。
 */
export function createAppJwt(appId: string, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  // iat を 60 秒巻き戻して、GitHub 側との時計ずれで弾かれるのを防ぐ
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(payload),
  )}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKeyPem.replace(/\\n/g, "\n"));

  return `${signingInput}.${base64url(signature)}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Installation Token を取得する。有効期限 1 時間なので余裕を見てキャッシュする。 */
export async function getInstallationToken(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID?.trim();
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID?.trim();

  if (!appId || !privateKey || !installationId) {
    throw new Error(
      "GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / GITHUB_APP_INSTALLATION_ID is not configured",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 300 > now)
    return cachedToken.token;

  const jwt = createAppJwt(appId, privateKey);
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": USER_AGENT,
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to create installation token: ${res.status} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { token: string; expires_at: string };
  cachedToken = {
    token: data.token,
    expiresAt: Math.floor(new Date(data.expires_at).getTime() / 1000),
  };
  return cachedToken.token;
}

/** テスト用にトークンキャッシュを捨てる。 */
export function resetInstallationTokenCache(): void {
  cachedToken = null;
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const token = await getInstallationToken();
  const res = await fetch(GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (body.errors?.length) {
    throw new Error(
      `GitHub GraphQL errors: ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }
  if (!body.data) throw new Error("GitHub GraphQL returned no data");
  return body.data;
}

const PROJECT_ITEMS_QUERY = `
query($org: String!, $number: Int!, $statusField: String!, $cursor: String) {
  organization(login: $org) {
    projectV2(number: $number) {
      items(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          status: fieldValueByName(name: $statusField) {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          content {
            __typename
            ... on Issue {
              id number title url state createdAt updatedAt closedAt
              repository { name }
              assignees(first: 10) { nodes { login databaseId } }
            }
            ... on PullRequest {
              id number title url state isDraft reviewDecision
              createdAt updatedAt closedAt mergedAt
              repository { name }
              author { login ... on User { databaseId } }
              reviewRequests(first: 20) {
                nodes {
                  requestedReviewer {
                    __typename
                    ... on User { login databaseId }
                    ... on Team { slug name }
                  }
                }
              }
              latestOpinionatedReviews(first: 20) {
                nodes {
                  state
                  author { login ... on User { databaseId } }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

interface RawActor {
  login: string;
  databaseId?: number | null;
}

interface RawProjectItem {
  id: string;
  status: { name?: string } | null;
  content: RawIssueContent | RawPrContent | null;
}

interface RawIssueContent {
  __typename: "Issue";
  id: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  repository: { name: string };
  assignees: { nodes: RawActor[] };
}

interface RawPrContent {
  __typename: "PullRequest";
  id: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isDraft: boolean;
  reviewDecision: LusyPullRequest["reviewDecision"];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  repository: { name: string };
  author: RawActor | null;
  reviewRequests: {
    nodes: {
      requestedReviewer:
        | ({ __typename: "User" } & RawActor)
        | { __typename: "Team"; slug: string; name: string }
        | null;
    }[];
  };
  latestOpinionatedReviews: {
    nodes: { state: ReviewState; author: RawActor | null }[];
  };
}

function toUserRef(actor: RawActor | null | undefined): GitHubUserRef | null {
  if (!actor?.login) return null;
  return { login: actor.login, databaseId: actor.databaseId ?? null };
}

interface ProjectItemsResponse {
  organization: {
    projectV2: {
      items: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: RawProjectItem[];
      };
    } | null;
  } | null;
}

export interface ProjectSnapshot {
  issues: LusyIssue[];
  pullRequests: LusyPullRequest[];
}

/**
 * Project V2 上の Issue / PR をすべて取得する。
 *
 * 失敗した場合は例外を投げる。呼び出し側は中途半端な情報で通知を送らず、
 * snapshot も更新しないこと (issue #273 §17)。
 */
export async function fetchProjectItems(options: {
  org: string;
  projectNumber: number;
  statusField: string;
}): Promise<ProjectSnapshot> {
  const issues: LusyIssue[] = [];
  const pullRequests: LusyPullRequest[] = [];

  let cursor: string | null = null;
  let guard = 0;

  do {
    // 壊れた pageInfo で無限ループしないよう上限を設ける (50 * 100 = 5000 items)
    if (guard++ > 100) break;

    const data: ProjectItemsResponse = await graphql<ProjectItemsResponse>(
      PROJECT_ITEMS_QUERY,
      {
        org: options.org,
        number: options.projectNumber,
        statusField: options.statusField,
        cursor,
      },
    );

    const project = data.organization?.projectV2;
    if (!project) {
      throw new Error(
        `Project #${options.projectNumber} not found in org ${options.org}`,
      );
    }

    for (const node of project.items.nodes) {
      const content = node.content;
      if (!content) continue; // DraftIssue など Issue/PR 以外
      const projectStatus = node.status?.name ?? null;

      if (content.__typename === "Issue") {
        issues.push({
          nodeId: content.id,
          repository: content.repository.name,
          number: content.number,
          title: content.title,
          url: content.url,
          state: content.state,
          assignees: content.assignees.nodes
            .map(toUserRef)
            .filter((u): u is GitHubUserRef => u !== null),
          projectStatus,
          createdAt: content.createdAt,
          updatedAt: content.updatedAt,
          closedAt: content.closedAt,
        });
        continue;
      }

      if (content.__typename === "PullRequest") {
        const requestedUsers: GitHubUserRef[] = [];
        const requestedTeams: GitHubTeamRef[] = [];
        for (const rr of content.reviewRequests.nodes) {
          const reviewer = rr.requestedReviewer;
          if (!reviewer) continue;
          if (reviewer.__typename === "Team") {
            requestedTeams.push({ slug: reviewer.slug, name: reviewer.name });
          } else {
            const user = toUserRef(reviewer);
            if (user) requestedUsers.push(user);
          }
        }

        pullRequests.push({
          nodeId: content.id,
          repository: content.repository.name,
          number: content.number,
          title: content.title,
          url: content.url,
          author: toUserRef(content.author),
          state: content.state,
          isDraft: content.isDraft,
          requestedUsers,
          requestedTeams,
          reviewDecision: content.reviewDecision,
          latestReviews: content.latestOpinionatedReviews.nodes.map((r) => ({
            author: toUserRef(r.author),
            state: r.state,
          })),
          projectStatus,
          createdAt: content.createdAt,
          updatedAt: content.updatedAt,
          closedAt: content.closedAt,
          mergedAt: content.mergedAt,
        });
      }
    }

    cursor = project.items.pageInfo.hasNextPage
      ? project.items.pageInfo.endCursor
      : null;
  } while (cursor);

  return { issues, pullRequests };
}

/**
 * Team のメンバーを取得する (Organization Members: Read が必要)。
 * レビュー依頼が Team 宛のとき、メンバー全員へ DM を配るために使う。
 */
export async function fetchTeamMembers(
  org: string,
  slug: string,
): Promise<GitHubUserRef[]> {
  const token = await getInstallationToken();
  const members: GitHubUserRef[] = [];

  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${GITHUB_API}/orgs/${org}/teams/${slug}/members?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": USER_AGENT,
        },
      },
    );

    if (!res.ok) {
      throw new Error(
        `Failed to fetch members of team ${slug}: ${res.status} ${await res.text()}`,
      );
    }

    const page_ = (await res.json()) as { login: string; id: number }[];
    for (const m of page_) members.push({ login: m.login, databaseId: m.id });
    if (page_.length < 100) break;
  }

  return members;
}
