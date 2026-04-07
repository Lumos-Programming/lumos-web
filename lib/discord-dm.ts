/**
 * Discord DM integration for sending rich embed messages to users
 */

import type { MemberDocument } from "@/lib/members";

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

type DiscordMessagePayload = {
  embeds: DiscordEmbed[];
  components?: DiscordActionRow[];
};

// --- Constants ---

const LOGO_URL = "https://lumos-ynu.jp/assets/Lumoslogo.png";
const FOOTER_TEXT = "Lumos | 横浜国立大学プログラミングサークル";
const BRAND_COLOR = 0x293c59;
const SUCCESS_COLOR = 0x57f287;

function getBaseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

// --- Profile completion ---

const PROFILE_FIELDS = [
  { key: "bio", label: "自己紹介", check: (m: MemberDocument) => !!m.bio },
  {
    key: "faceImage",
    label: "顔写真",
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
        title: "Lumos Webへようこそ！",
        description: `${username} さん、アカウント登録ありがとうございます！\n早速プロフィールを入力して、オンボーディングを完了させましょう！`,
        color: BRAND_COLOR,
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
            label: "オンボーディングを始める",
            url: `${getBaseUrl()}/internal/onboarding`,
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
  const fields: DiscordEmbedField[] = [
    {
      name: "📊 プロフィール充足率",
      value: `${completion.percentage}% (${completion.filledCount}/${completion.totalCount}項目)`,
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
        description: `おめでとうございます！\nオンボーディングが完了しました。`,
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
