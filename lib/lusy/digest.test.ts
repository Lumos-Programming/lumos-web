import { describe, it, expect } from "vitest";
import {
  DISCORD_MESSAGE_LIMIT,
  buildChannelDigest,
  buildPersonalDm,
  formatItemLine,
  type DigestGroup,
} from "./digest";
import type { ActionItem } from "./types";

const rng = () => 0;

function item(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    nodeId: `N_${overrides.number ?? 1}`,
    itemType: "issue",
    repository: "lumos-web",
    number: 1,
    title: "ログイン画面を作る",
    url: "https://github.com/Lumos-Programming/lumos-web/issues/1",
    kind: "issue_open",
    ...overrides,
  };
}

describe("formatItemLine", () => {
  it("renders a masked link with repo and number", () => {
    expect(formatItemLine(item({ number: 123 }))).toBe(
      "- [lumos-web #123](https://github.com/Lumos-Programming/lumos-web/issues/1) ログイン画面を作る",
    );
  });

  it("marks team-routed review requests", () => {
    const line = formatItemLine(
      item({
        kind: "review_waiting",
        viaTeam: { slug: "sys", name: "SystemDevTeam2025" },
      }),
    );
    expect(line).toContain("チーム宛: SystemDevTeam2025");
  });

  it("strips brackets that would break the masked link", () => {
    expect(formatItemLine(item({ title: "[WIP] fix [bug]" }))).toContain(
      "WIP fix bug",
    );
  });

  it("truncates long titles", () => {
    const line = formatItemLine(item({ title: "あ".repeat(200) }));
    expect(line.length).toBeLessThan(200);
    expect(line).toContain("…");
  });
});

describe("buildPersonalDm", () => {
  it("returns null when there is nothing to act on", () => {
    expect(
      buildPersonalDm(
        { discordId: "d1", githubLogin: "alice", items: [] },
        { rng },
      ),
    ).toBeNull();
  });

  it("excludes completed items — the DM is an action queue only", () => {
    const content = buildPersonalDm(
      {
        discordId: "d1",
        githubLogin: "alice",
        items: [
          item({ kind: "pr_merged", number: 9 }),
          item({ kind: "issue_completed", number: 10 }),
        ],
      },
      { rng },
    );
    expect(content).toBeNull();
  });

  it("groups items into one message per section", () => {
    const content = buildPersonalDm(
      {
        discordId: "d1",
        githubLogin: "alice",
        items: [
          item({ number: 1, kind: "issue_open" }),
          item({ number: 2, kind: "issue_open" }),
          item({ number: 3, kind: "draft", itemType: "pull_request" }),
        ],
      },
      { rng },
    );
    expect(content).toContain("#1");
    expect(content).toContain("#2");
    expect(content).toContain("#3");
    // セクションは空行で区切られる
    expect(content?.split("\n\n").length).toBe(2);
  });

  it("uses the team-specific wording when every review came via a team", () => {
    const content = buildPersonalDm(
      {
        discordId: "d1",
        githubLogin: "alice",
        items: [
          item({
            kind: "review_waiting",
            itemType: "pull_request",
            viaTeam: { slug: "sys", name: "SystemDevTeam2025" },
          }),
        ],
      },
      { rng },
    );
    expect(content).toContain("チーム宛");
  });
});

describe("buildChannelDigest", () => {
  it("mentions linked members and falls back to plain GitHub usernames", () => {
    const groups: DigestGroup[] = [
      { discordId: "111", githubLogin: "alice", items: [item({ number: 1 })] },
      { discordId: null, githubLogin: "bob", items: [item({ number: 2 })] },
    ];
    const [message] = buildChannelDigest(groups, { rng });

    expect(message.content).toContain("<@111>");
    expect(message.content).toContain("@bob");
    // 存在しない Mention を作らない
    expect(message.content).not.toContain("<@bob>");
    expect(message.mentionedUserIds).toEqual(["111"]);
  });

  it("keeps unlinked members in the digest rather than dropping their work", () => {
    const [message] = buildChannelDigest(
      [{ discordId: null, githubLogin: "bob", items: [item({ number: 7 })] }],
      { rng },
    );
    expect(message.content).toContain("#7");
  });

  it("omits the mention line entirely for unowned items", () => {
    const [message] = buildChannelDigest(
      [
        {
          discordId: null,
          githubLogin: "",
          items: [item({ kind: "issue_unassigned", number: 5 })],
        },
      ],
      { rng },
    );
    expect(message.content).toContain("担当者未定");
    expect(message.content).not.toContain("@");
  });

  it("returns no messages when there is nothing to report", () => {
    expect(buildChannelDigest([], { rng })).toEqual([]);
  });

  it("splits into multiple messages under the 2000 character limit", () => {
    const many: DigestGroup[] = Array.from({ length: 40 }, (_, i) => ({
      discordId: `user${i}`,
      githubLogin: `user${i}`,
      items: [
        item({ number: i, title: `かなり長めのタイトル ${"あ".repeat(40)}` }),
        item({
          number: 1000 + i,
          kind: "review_waiting",
          itemType: "pull_request",
          title: `レビュー待ち ${"い".repeat(40)}`,
        }),
      ],
    }));

    const messages = buildChannelDigest(many, { rng });
    expect(messages.length).toBeGreaterThan(1);
    for (const m of messages) {
      expect(m.content.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT);
    }
  });

  it("only reports mention ids that actually appear in that chunk's content", () => {
    const many: DigestGroup[] = Array.from({ length: 30 }, (_, i) => ({
      discordId: `user${i}`,
      githubLogin: `user${i}`,
      items: [item({ number: i, title: "あ".repeat(50) })],
    }));

    for (const message of buildChannelDigest(many, { rng })) {
      for (const id of message.mentionedUserIds) {
        expect(message.content).toContain(`<@${id}>`);
      }
    }
  });

  it("merges merged PRs and completed issues into one celebration section", () => {
    const [message] = buildChannelDigest(
      [
        {
          discordId: "111",
          githubLogin: "alice",
          items: [
            item({ kind: "pr_merged", itemType: "pull_request", number: 1 }),
            item({ kind: "issue_completed", number: 2 }),
          ],
        },
      ],
      { rng },
    );
    expect(message.content.match(/やったやつ/g)).toHaveLength(1);
  });
});
