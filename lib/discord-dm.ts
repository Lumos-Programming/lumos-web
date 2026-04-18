/**
 * Discord DM integration for sending rich embed messages to users
 */

import type { MemberDocument } from "@/lib/members";
import { getOptoutRequestUrl } from "@/lib/discord-optout";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// --- Types ---

type DiscordEmbedField = {
  name: string;
  value: string;
  inline?: boolean;
};

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  fields?: DiscordEmbedField[];
  thumbnail?: { url: string };
  footer?: { text: string };
};

type DiscordButtonComponent = {
  type: 2; // Button
  style: 5; // Link
  label: string;
  url: string;
  emoji?: { name: string };
};

type DiscordActionRow = {
  type: 1; // Action Row
  components: DiscordButtonComponent[];
};

export type DiscordMessagePayload = {
  embeds: DiscordEmbed[];
  components?: DiscordActionRow[];
};

// --- Constants ---

const LOGO_URL = "https://lumos-ynu.jp/assets/lumos_logo-full.png";
const FOOTER_TEXT = "Lumos | 横浜国立大学プログラミングサークル";
const WELCOME_COLOR = 0xfee75c; // Discord Yellow — 明るくフレンドリーな印象
const SUCCESS_COLOR = 0x57f287; // Discord Green — 達成感
const LOGIN_COLOR = 0x5865f2; // Discord Blurple — 日常的な通知
const WELCOME_BACK_COLOR = 0xeb459e; // Discord Fuchsia — おかえり感
const CONTINUATION_CHECK_COLOR = 0x5865f2; // Discord Blurple — 継続確認

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

// --- Profile completion ---

const PROFILE_FIELDS = [
  { key: "bio", label: "自己紹介", check: (m: MemberDocument) => !!m.bio },
  {
    key: "faceImage",
    label: "プロフィール顔写真",
    check: (m: MemberDocument) => !!m.faceImage,
  },
  {
    key: "github",
    label: "GitHub",
    check: (m: MemberDocument) => !!m.github,
  },
  {
    key: "x",
    label: "X (Twitter)",
    check: (m: MemberDocument) => !!m.x,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    check: (m: MemberDocument) => !!m.linkedin,
  },
  {
    key: "interests",
    label: "興味分野",
    check: (m: MemberDocument) => !!m.interests && m.interests.length > 0,
  },
  {
    key: "birthDate",
    label: "生年月日",
    check: (m: MemberDocument) => !!m.birthDate,
  },
  {
    key: "nickname",
    label: "ニックネーム",
    check: (m: MemberDocument) => !!m.nickname,
  },
  {
    key: "gender",
    label: "性別",
    check: (m: MemberDocument) => !!m.gender,
  },
] as const;

export function calcProfileCompletion(member: MemberDocument): {
  percentage: number;
  filledCount: number;
  totalCount: number;
  missingFields: string[];
} {
  const totalCount = PROFILE_FIELDS.length;
  const missingFields: string[] = [];

  for (const field of PROFILE_FIELDS) {
    if (!field.check(member)) {
      missingFields.push(field.label);
    }
  }

  const filledCount = totalCount - missingFields.length;
  const percentage = Math.round((filledCount / totalCount) * 100);

  return { percentage, filledCount, totalCount, missingFields };
}

// --- Message builders ---

export function buildWelcomeMessage(username: string): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: "✨ Lumosへようこそ！",
        description: [
          `${username} さん、Lumosポータルサイトへようこそ！🪄`,
          "",
          "**Lumos Webでできること：**",
          "👥 Lumosのメンバーについて知る",
          "🎨 自分だけのプロフィールを作る",
          "📅 ミニLTなどの各種イベントに参加登録する",
          "",
          "まずは**オンボーディング**を完了させてみましょう💪",
        ].join("\n"),
        color: WELCOME_COLOR,
        thumbnail: { url: LOGO_URL },
        footer: { text: FOOTER_TEXT },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "オンボーディングへLet's Go!",
            url: `${getBaseUrl()}/onboarding`,
            emoji: { name: "📋" },
          },
        ],
      },
    ],
  };
}

export function buildOnboardingCompleteMessage(
  username: string,
  completion: {
    percentage: number;
    filledCount: number;
    totalCount: number;
    missingFields: string[];
  },
): DiscordMessagePayload {
  const pct = completion.percentage;
  const completionComment =
    pct === 100
      ? "パーフェクト！✨ もう何も言うことはありません！"
      : pct >= 80
        ? "あとちょっと…！完璧まであと一歩です💪"
        : pct >= 50
          ? "いい感じ！もう少し埋めるとプロフィールが輝きます🌟"
          : "まだまだ伸びしろたっぷり！気が向いたら埋めてみてね📝";

  const fields: DiscordEmbedField[] = [
    {
      name: "📊 プロフィール充足率",
      value: `**${pct}%** (${completion.filledCount}/${completion.totalCount}項目)\n${completionComment}`,
    },
  ];

  if (completion.missingFields.length > 0) {
    fields.push({
      name: "📝 未入力の項目",
      value: completion.missingFields.map((f) => `・${f}`).join("\n"),
    });
  }

  return {
    embeds: [
      {
        title: "🎉 オンボーディング完了！",
        description: [
          `**${username}** さん、オンボーディングが完了しました🥳`,
          "おめでとうございます！これで**Lumosの仲間入り**です！",
        ].join("\n"),
        color: SUCCESS_COLOR,
        fields,
        thumbnail: { url: LOGO_URL },
        footer: { text: FOOTER_TEXT },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "プロフィールを充実させる",
            url: `${getBaseUrl()}/internal/settings`,
            emoji: { name: "✏️" },
          },
        ],
      },
    ],
  };
}

const LOGIN_GREETINGS = [
  "今日も100億コントリビューションしましょう🚀",
  "**{name}** さん、今日もおつかれさまです🍵",
  "**{name}** さん、今日は何行コード書いたかな？👨‍💻",
  "**{name}** さん、git push前にコーヒーいかがですか？☕",
  "console.log('ようこそ、**{name}** さん')🖥️",
  "今日もlintエラー0件でありますように🙏",
  "今日も爆速開発しちゃいましょう⚡️**{name}** さん！",
  "**{name}** さん、今日のバグは明日のfeatureです🐛",
];

export function buildLoginMessage(username: string): DiscordMessagePayload {
  const template =
    LOGIN_GREETINGS[Math.floor(Math.random() * LOGIN_GREETINGS.length)];
  const greeting = template.replace("{name}", username);

  return {
    embeds: [
      {
        title: "👋 ログイン通知",
        description: `Lumos Webへのログインを検知しました!!\n${greeting}`,
        color: LOGIN_COLOR,
        footer: { text: FOOTER_TEXT },
      },
    ],
  };
}

export function buildWelcomeBackMessage(
  username: string,
  discordId: string,
  completion: {
    percentage: number;
    filledCount: number;
    totalCount: number;
    missingFields: string[];
  },
): DiscordMessagePayload {
  const fields: DiscordEmbedField[] = [];

  if (completion.missingFields.length > 0) {
    fields.push(
      {
        name: "📊 プロフィール充足率",
        value: `**${completion.percentage}%** (${completion.filledCount}/${completion.totalCount}項目)`,
      },
      {
        name: "📝 まだ埋まっていない項目",
        value: completion.missingFields.map((f) => `・${f}`).join("\n"),
      },
    );
  }

  return {
    embeds: [
      {
        title: "🏠 おかえりなさい！",
        description: [
          `**${username}** さん、久しぶりのログインうれしいです🎶`,
          "",
          ...(completion.missingFields.length > 0
            ? [
                "せっかくなので、まだ埋まっていないプロフィール項目もチェックしてみませんか？",
              ]
            : ["久しぶりに自分のプロフィールを見直してみませんか？🔄"]),
        ].join("\n"),
        color: WELCOME_BACK_COLOR,
        fields: fields.length > 0 ? fields : undefined,
        thumbnail: { url: LOGO_URL },
        footer: { text: FOOTER_TEXT },
      },
    ],
    components: [
      {
        type: 1 as const,
        components: [
          ...(completion.missingFields.length > 0
            ? [
                {
                  type: 2 as const,
                  style: 5 as const,
                  label: "プロフィールを充実させる",
                  url: `${getBaseUrl()}/internal/settings`,
                  emoji: { name: "✨" },
                },
              ]
            : []),
          {
            type: 2 as const,
            style: 5 as const,
            label: "自分のプロフィールを確認する",
            url: `${getBaseUrl()}/internal/members?member=${discordId}`,
            emoji: { name: "👀" },
          },
        ],
      },
    ],
  };
}

function buildOptoutEmbed(): DiscordEmbed {
  return {
    title: "👋 退会をご希望の方へ",
    description: [
      "2026年度のLumos活動を **継続しない** 場合は、下の「継続しない / 退会する」ボタンから意思表示をお願いします。",
      "",
      "退会後もLumosのDiscordサーバーには引き続き参加いただけますが、**メンバー用チャンネルは閲覧できなくなります**。",
      "**5月末まで** はメンバー用チャンネルを引き続きご覧いただけ、その後アクセスが制限されます。",
    ].join("\n"),
    color: CONTINUATION_CHECK_COLOR,
  };
}

export function buildRegistrationNudgeMessage(
  username: string,
  discordId: string,
): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: "📢 Lumos Web メンバー登録のお願い",
        description: [
          `${username} さん、こんにちは！`,
          "",
          "2026年度より、Lumosのメンバー管理は **Lumos Web** で行われることになりました。",
          "",
          "### Lumos Webでできること",
          "💬 Lumos2026のLINEグループに参加する",
          "👥 Lumosのメンバーについて知る",
          "🎨 自分だけのプロフィールを作る",
          "📅 ミニLTなどの各種イベントに参加登録する",
          "",
          "### ⚠️ 登録が必要です",
          "現役生・卒業生・社会人を問わず、2026年度もLumosのDiscordサーバーに参加するためには **Lumos Webへの登録が必要** です。",
          "",
          "Discordアカウントで簡単にログインできます。ぜひ登録をお願いします！🙏",
          "",
          "_※ LumosのDiscordサーバーに参加されているため、このメッセージをお送りしています。_",
        ].join("\n"),
        color: WELCOME_COLOR,
        thumbnail: { url: LOGO_URL },
        footer: { text: FOOTER_TEXT },
      },
      {
        title: "🚨 対応期限：2026年4月18日（金）",
        description:
          "期限を過ぎるとDiscordサーバーへのアクセスが制限される場合があります。\nお早めの登録をお願いします！",
        color: 0xed4245, // Discord Red
      },
      buildOptoutEmbed(),
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Lumos Webで2026年度メンバー登録をする",
            url: `${getBaseUrl()}/onboarding`,
            emoji: { name: "🚀" },
          },
          {
            type: 2,
            style: 5,
            label: "継続しない / 退会する",
            url: getOptoutRequestUrl(discordId),
            emoji: { name: "👋" },
          },
        ],
      },
    ],
  };
}

export function buildOnboardingNudgeMessage(
  username: string,
  discordId: string,
): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: "📋 オンボーディングを完了させましょう！",
        description: [
          `${username} さん、こんにちは！`,
          "",
          "Lumos Webへのログインありがとうございます！",
          "**オンボーディングがまだ完了していない**ようです。",
          "",
          "### ⚠️ オンボーディングの完了が必要です",
          "2026年度より、Lumosのメンバー管理はLumos Webで行われます。",
          "2026年度もLumosのDiscordサーバーに参加し続けるには、 **オンボーディングの完了が必要** です。",
          "",
          "### Lumos Webでできること",
          "👥 Lumosのメンバーについて知る",
          "🎨 自分だけのプロフィールを作る",
          "📅 ミニLTなどの各種イベントに参加登録する",
          "💬 LumosのLINEグループに参加する",
          "",
          "**数分で完了します。** ぜひオンボーディングを終わらせてください！🙏",
          "",
          "_※ LumosのDiscordサーバーに参加されているため、このメッセージをお送りしています。_",
        ].join("\n"),
        color: WELCOME_COLOR,
        thumbnail: { url: LOGO_URL },
        footer: { text: FOOTER_TEXT },
      },
      {
        title: "🚨 対応期限：2026年4月18日（金）",
        description:
          "期限を過ぎるとDiscordサーバーへのアクセスが制限される場合があります。\nお早めの対応をお願いします！",
        color: 0xed4245, // Discord Red
      },
      buildOptoutEmbed(),
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "オンボーディングへLet's Go!",
            url: `${getBaseUrl()}/internal/onboarding`,
            emoji: { name: "📋" },
          },
          {
            type: 2,
            style: 5,
            label: "継続しない / 退会する",
            url: getOptoutRequestUrl(discordId),
            emoji: { name: "👋" },
          },
        ],
      },
    ],
  };
}

/**
 * Step 2 確認用 DM: Web 上で退会リクエストを送信したユーザーに、本人確認として
 * 別途 DM で最終確認リンク (20 分有効) を送る
 */
export function buildOptoutConfirmRequestMessage(
  username: string,
  finalizeUrl: string,
): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: "🔒 退会の最終確認",
        description: [
          `${username} さん、Web上で退会のリクエストを受け付けました。`,
          "本人確認のため、下の「退会処理を完了させる」ボタンを **20分以内** に開いてください",
          "",
          "退会後もLumosのDiscordサーバーには引き続き参加いただけますが、**メンバー用チャンネルは閲覧できなくなります**。",
          "",
          "**⏰ このリンクは20分で失効します。**",
        ].join("\n"),
        color: CONTINUATION_CHECK_COLOR,
        footer: { text: FOOTER_TEXT },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "退会処理を完了させる",
            url: finalizeUrl,
            emoji: { name: "✅" },
          },
        ],
      },
    ],
  };
}

// --- Discord API ---

async function createDmChannel(recipientId: string): Promise<string> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const response = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: recipientId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create DM channel: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.id;
}

async function sendChannelMessage(
  channelId: string,
  payload: DiscordMessagePayload,
): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send DM message: ${response.status} ${error}`);
  }
}

export async function sendDiscordDm(
  recipientId: string,
  payload: DiscordMessagePayload,
): Promise<void> {
  const channelId = await createDmChannel(recipientId);
  await sendChannelMessage(channelId, payload);
}
