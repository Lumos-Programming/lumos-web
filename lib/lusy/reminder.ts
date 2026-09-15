/**
 * 定期実行の本体。GitHub から取得 → 分類 → DM とチャンネル Digest を送る。
 *
 * エラー方針 (issue #273 §17):
 *   GitHub の取得に失敗したら何も送らず snapshot も更新しない。
 *   DM の個別失敗は握りつぶして他ユーザーとチャンネル通知を続ける。
 */

import { sendDiscordDm, sendChannelMessage } from "@/lib/discord-dm";
import type { LusyConfig } from "./config";
import { isTargetRepo } from "./config";
import {
  assignmentsForIssue,
  assignmentsForPullRequest,
  dedupeAssignments,
  type Assignment,
} from "./classify";
import {
  buildChannelDigest,
  buildPersonalDm,
  type DigestGroup,
} from "./digest";
import { fetchProjectItems, fetchTeamMembers } from "./github";
import { loadRoster, resolveDiscordId, type Roster } from "./roster";
import {
  listPendingCompletions,
  markCompletionsNotified,
  recordNotifications,
  saveItemSnapshots,
  setLastSuccessfulRunAt,
  type ItemSnapshot,
  type NotificationLogEntry,
} from "./store";
import type { ActionItem, GitHubUserRef } from "./types";
import type { Rng } from "./templates";

export interface ReminderSummary {
  issues: number;
  pullRequests: number;
  dmSent: number;
  dmFailed: number;
  dmSkippedUnlinked: number;
  digestChunks: number;
  celebrated: number;
}

/** 1 人分の集約キー。Discord 連携があれば discordId、無ければ login。 */
function groupKey(
  user: GitHubUserRef | null,
  discordId: string | null,
): string {
  if (discordId) return `discord:${discordId}`;
  if (user) return `github:${user.login.toLowerCase()}`;
  return "__unowned__";
}

/** PR が参照している Team を先にまとめて解決しておく (分類ロジックを同期に保つため)。 */
async function resolveTeams(
  config: LusyConfig,
  slugs: string[],
): Promise<Map<string, GitHubUserRef[]>> {
  const resolved = new Map<string, GitHubUserRef[]>();
  if (!config.fanOutTeamReviews) return resolved;

  for (const slug of [...new Set(slugs)]) {
    try {
      resolved.set(slug, await fetchTeamMembers(config.org, slug));
    } catch (error) {
      // 権限不足などで展開できなくてもチャンネルには出す (通知を落とさない)
      console.error(`Failed to expand team ${slug}:`, error);
      resolved.set(slug, []);
    }
  }
  return resolved;
}

export async function runLusyReminder(
  config: LusyConfig,
  options: { rng?: Rng } = {},
): Promise<ReminderSummary> {
  // --- 1. GitHub から取得（失敗したら例外がそのまま伝播し、何も送らない） ---
  const { issues, pullRequests } = await fetchProjectItems({
    org: config.org,
    projectNumber: config.projectNumber,
    statusField: config.projectStatusField,
  });

  const targetIssues = issues.filter((i) =>
    isTargetRepo(i.repository, config.targetRepos),
  );
  const targetPrs = pullRequests.filter((p) =>
    isTargetRepo(p.repository, config.targetRepos),
  );

  // --- 2. Team 展開と members の解決 ---
  const teamMembers = await resolveTeams(
    config,
    targetPrs.flatMap((p) => p.requestedTeams.map((t) => t.slug)),
  );
  const roster: Roster = await loadRoster();

  // --- 3. 分類して Assignment に展開 ---
  const assignments: Assignment[] = [
    ...targetIssues.flatMap((i) => assignmentsForIssue(i, config.doneStatuses)),
    ...targetPrs.flatMap((p) =>
      assignmentsForPullRequest(p, (slug) => teamMembers.get(slug) ?? []),
    ),
  ];

  // --- 4. 人ごとにまとめる ---
  const groups = new Map<string, DigestGroup>();
  const addItem = (
    user: GitHubUserRef | null,
    discordId: string | null,
    item: ActionItem,
  ) => {
    const key = groupKey(user, discordId);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      return;
    }
    groups.set(key, {
      discordId,
      githubLogin: user?.login ?? "",
      items: [item],
    });
  };

  for (const a of dedupeAssignments(assignments)) {
    // pr_merged は Assignment 経由では祝わない（完了イベント側で一度だけ扱う）
    if (a.item.kind === "pr_merged") continue;
    const discordId = a.user ? resolveDiscordId(roster, a.user) : null;
    addItem(a.user, discordId, a.item);
  }

  // --- 5. 完了イベント（Webhook 由来。一度だけ祝う） ---
  const completions = await listPendingCompletions();
  for (const event of completions) {
    const item: ActionItem = {
      nodeId: event.nodeId,
      itemType: event.itemType,
      repository: event.repository,
      number: event.number,
      title: event.title,
      url: event.url,
      kind: event.itemType === "issue" ? "issue_completed" : "pr_merged",
    };
    if (event.celebrants.length === 0) {
      addItem(null, null, item);
      continue;
    }
    for (const user of event.celebrants) {
      addItem(user, resolveDiscordId(roster, user), item);
    }
  }

  const allGroups = [...groups.values()];

  // --- 6. DM 送信（個別失敗は継続） ---
  const summary: ReminderSummary = {
    issues: targetIssues.length,
    pullRequests: targetPrs.length,
    dmSent: 0,
    dmFailed: 0,
    dmSkippedUnlinked: 0,
    digestChunks: 0,
    celebrated: completions.length,
  };
  const logEntries: NotificationLogEntry[] = [];

  for (const group of allGroups) {
    if (!group.discordId) {
      if (group.githubLogin) summary.dmSkippedUnlinked++;
      continue;
    }
    const content = buildPersonalDm(group, { rng: options.rng });
    if (!content) continue;

    try {
      await sendDiscordDm(group.discordId, {
        content,
        // DM でも念のため Mention を封じる（本文に混ざっても暴発させない）
        allowed_mentions: { parse: [] },
      });
      summary.dmSent++;
      for (const item of group.items) {
        logEntries.push({
          itemId: item.nodeId,
          notificationType: `dm:${item.kind}`,
          discordUserId: group.discordId,
        });
      }
    } catch (error) {
      summary.dmFailed++;
      console.error(`Lusy DM failed for ${group.discordId}:`, error);
    }
  }

  // --- 7. チャンネル Digest ---
  const chunks = buildChannelDigest(allGroups, { rng: options.rng });
  for (const chunk of chunks) {
    try {
      await sendChannelMessage(config.channelId, {
        content: chunk.content,
        // 本文に実際に載せた ID だけ許可する（@everyone 等の暴発を防ぐ）
        allowed_mentions: { parse: [], users: chunk.mentionedUserIds },
      });
      summary.digestChunks++;
    } catch (error) {
      console.error("Lusy channel digest failed:", error);
    }
  }

  // --- 8. 後始末 ---
  await markCompletionsNotified(completions.map((c) => c.nodeId));
  await recordNotifications(logEntries);

  const snapshots: ItemSnapshot[] = [
    ...targetIssues.map<ItemSnapshot>((i) => ({
      nodeId: i.nodeId,
      repository: i.repository,
      itemType: "issue",
      number: i.number,
      previousState: i.state,
      previousProjectStatus: i.projectStatus,
      updatedAt: i.updatedAt,
    })),
    ...targetPrs.map<ItemSnapshot>((p) => ({
      nodeId: p.nodeId,
      repository: p.repository,
      itemType: "pull_request",
      number: p.number,
      previousState: p.state,
      previousDraftState: p.isDraft,
      previousReviewState: p.reviewDecision,
      previousProjectStatus: p.projectStatus,
      updatedAt: p.updatedAt,
    })),
  ];
  await saveItemSnapshots(snapshots);
  await setLastSuccessfulRunAt(Math.floor(Date.now() / 1000));

  return summary;
}
