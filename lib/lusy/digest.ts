/**
 * DM / チームチャンネルに送る本文を組み立てる。
 *
 * Mention は必ず `content` に入れる。embed の description に `<@id>` を書いても
 * 見た目は Mention になるが通知は飛ばないため、ping の用を成さない。
 *
 * 1 メッセージ 2000 文字の上限があるので、セクション境界で分割する。
 */

import { pickTemplate, type Rng, type TemplateCategory } from "./templates";
import type { ActionItem, PersonalQueue } from "./types";

export const DISCORD_MESSAGE_LIMIT = 2000;
const TITLE_MAX = 60;

/** Digest 上のセクション。表示順もこの配列の順。 */
const SECTIONS: {
  kind: ActionItem["kind"];
  heading: string;
  category: TemplateCategory;
}[] = [
  { kind: "issue_open", heading: "🔥 残タスク", category: "issue_reminder" },
  { kind: "draft", heading: "🚧 DRAFT", category: "draft_pr" },
  { kind: "review_waiting", heading: "👀 REVIEW", category: "review_request" },
  {
    kind: "reviewer_unassigned",
    heading: "🙋 reviewer未指定",
    category: "unassigned_review",
  },
  {
    kind: "changes_requested",
    heading: "🛠 修正待ち",
    category: "changes_requested",
  },
  {
    kind: "issue_unassigned",
    heading: "🧭 担当者未定",
    category: "issue_reminder",
  },
  { kind: "pr_merged", heading: "🎉 やったやつ", category: "pr_merged" },
  {
    kind: "issue_completed",
    heading: "🎉 やったやつ",
    category: "issue_completed",
  },
];

function truncate(text: string, max = TITLE_MAX): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/**
 * Discord のマークダウンリンクを壊す文字を落とす。
 * タイトルに `[` `]` が入ると masked link の構文が崩れる。
 */
function sanitizeTitle(title: string): string {
  return truncate(title.replace(/[[\]]/g, ""));
}

/** `- [LumosWeb #123](url) タイトル` 形式の 1 行。 */
export function formatItemLine(item: ActionItem): string {
  const label = `${item.repository} #${item.number}`;
  const suffix = item.viaTeam ? ` （チーム宛: ${item.viaTeam.name}）` : "";
  return `- [${label}](${item.url}) ${sanitizeTitle(item.title)}${suffix}`;
}

function groupByKind(
  items: ActionItem[],
): Map<ActionItem["kind"], ActionItem[]> {
  const map = new Map<ActionItem["kind"], ActionItem[]>();
  for (const item of items) {
    const list = map.get(item.kind);
    if (list) list.push(item);
    else map.set(item.kind, [item]);
  }
  return map;
}

/**
 * 個人 DM の本文を組み立てる。
 * 「あなたが次に何をすればいいか」だけを載せる Personal Action Queue なので、
 * 完了イベントは含めない (issue #273 §8)。
 */
export function buildPersonalDm(
  queue: PersonalQueue,
  options: { rng?: Rng } = {},
): string | null {
  const actionable = queue.items.filter(
    (i) => i.kind !== "pr_merged" && i.kind !== "issue_completed",
  );
  if (actionable.length === 0) return null;

  const grouped = groupByKind(actionable);
  const blocks: string[] = [];

  for (const section of SECTIONS) {
    const items = grouped.get(section.kind);
    if (!items || items.length === 0) continue;

    // Team 宛のレビューは専用カテゴリの文面にする（個人指名と区別する）
    const category: TemplateCategory =
      section.kind === "review_waiting" && items.every((i) => i.viaTeam)
        ? "team_review_request"
        : section.category;

    // 1 件のときだけ `{{number}}` 入りテンプレートを許可する
    const header = pickTemplate(category, {
      rng: options.rng,
      itemNumber: items.length === 1 ? items[0].number : undefined,
    });

    blocks.push([header.text, ...items.map(formatItemLine)].join("\n"));
  }

  return blocks.join("\n\n");
}

/** チャンネル Digest 上で 1 人分をまとめた塊。 */
export interface DigestGroup {
  /** 紐付いていれば Discord ID。未連携なら null。 */
  discordId: string | null;
  githubLogin: string;
  items: ActionItem[];
}

/**
 * Mention 行。担当者が居ない Item (githubLogin が空) では null を返し、行自体を出さない。
 * 存在しない Discord Mention は作らず、未連携なら GitHub username を平文で出す。
 */
function mentionFor(group: DigestGroup): string | null {
  if (group.discordId) return `<@${group.discordId}>`;
  if (!group.githubLogin) return null;
  return `@${group.githubLogin}`;
}

export interface DigestMessage {
  content: string;
  /** allowed_mentions に渡す、実際に本文へ含めたユーザー ID。 */
  mentionedUserIds: string[];
}

/**
 * チャンネル Digest を組み立て、2000 文字に収まるよう分割する。
 * 分割はセクション境界を優先し、1 セクションが単体で超える場合は行単位で割る。
 */
export function buildChannelDigest(
  groups: DigestGroup[],
  options: { rng?: Rng } = {},
): DigestMessage[] {
  const header = pickTemplate("digest_header", { rng: options.rng }).text;

  /** Mention 1 人分のまとまり。どの chunk に入ったかで allowed_mentions が決まる。 */
  type Block = { text: string; userId: string | null };
  const rendered: { heading: string; blocks: Block[] }[] = [];

  for (const section of SECTIONS) {
    const blocks: Block[] = [];

    for (const group of groups) {
      const items = group.items.filter((i) => i.kind === section.kind);
      if (items.length === 0) continue;

      const mention = mentionFor(group);
      const lines = items.map(formatItemLine);
      blocks.push({
        text: (mention ? [mention, ...lines] : lines).join("\n"),
        userId: group.discordId,
      });
    }

    if (blocks.length === 0) continue;

    // 「🎉 やったやつ」は pr_merged と issue_completed の 2 kind をまとめる
    const existing = rendered.find((r) => r.heading === section.heading);
    if (existing) existing.blocks.push(...blocks);
    else rendered.push({ heading: section.heading, blocks });
  }

  if (rendered.length === 0) return [];

  const chunks: DigestMessage[] = [];
  let current = header;
  let currentIds: string[] = [];

  const flush = () => {
    if (!current.trim()) return;
    chunks.push({
      content: current,
      mentionedUserIds: [...new Set(currentIds)],
    });
    current = "";
    currentIds = [];
  };

  const idsOf = (blocks: Block[]) =>
    blocks.map((b) => b.userId).filter((v): v is string => v !== null);

  for (const section of rendered) {
    const heading = `## ${section.heading}`;
    const whole = [heading, ...section.blocks.map((b) => b.text)].join("\n\n");
    const candidate = current ? `${current}\n\n${whole}` : whole;

    if (candidate.length <= DISCORD_MESSAGE_LIMIT) {
      current = candidate;
      currentIds.push(...idsOf(section.blocks));
      continue;
    }

    // セクションが収まらない場合はブロック単位で割り、見出しを繰り返す。
    // ID はその chunk に実際に載ったブロックの分だけ計上する。
    // (セクション全体の ID をまとめて最後の chunk に付けると、先行 chunk の
    //  Mention が allowed_mentions から漏れて ping が飛ばなくなる)
    flush();
    current = heading;

    for (const block of section.blocks) {
      const next = `${current}\n\n${block.text}`;
      if (next.length <= DISCORD_MESSAGE_LIMIT) {
        current = next;
        if (block.userId) currentIds.push(block.userId);
        continue;
      }
      flush();
      current = `${heading}\n\n${block.text}`;
      currentIds = block.userId ? [block.userId] : [];
    }
  }

  flush();

  // 単一ブロックだけで上限を超えるケースの保険。行単位で強制分割する。
  return chunks.flatMap(splitOverlongMessage);
}

/** 上限を超えたメッセージを行境界で割る。Mention ID は実際に含まれる行から引き直す。 */
function splitOverlongMessage(message: DigestMessage): DigestMessage[] {
  if (message.content.length <= DISCORD_MESSAGE_LIMIT) return [message];

  const parts: DigestMessage[] = [];
  let buf = "";

  const push = () => {
    if (!buf.trim()) return;
    parts.push({
      content: buf,
      mentionedUserIds: message.mentionedUserIds.filter((id) =>
        buf.includes(`<@${id}>`),
      ),
    });
    buf = "";
  };

  for (const line of message.content.split("\n")) {
    const next = buf ? `${buf}\n${line}` : line;
    if (next.length > DISCORD_MESSAGE_LIMIT) {
      push();
      buf = line.slice(0, DISCORD_MESSAGE_LIMIT);
    } else {
      buf = next;
    }
  }
  push();

  return parts;
}
