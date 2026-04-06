export type Member = {
  id: string; // discordId
  name: string;
  role: string;
  department: string;
  year: string;
  bio: string;
  image: string;
  faceImage?: string; // GCS URL (顔写真)
  snsAvatar?: string; // Discord or LINE アバター (内部メンバー表示用)
  social?: {
    x?: string;
    xAvatar?: string;
    github?: string;
    githubAvatar?: string;
    discord?: string;
    discordUsername?: string;
    discordAvatar?: string;
    linkedin?: string;
    line?: string;
    lineAvatar?: string;
    website?: string;
  };
  nickname?: string; // ニックネーム（visibility に従う）
  memberType?: string; // 学部生/院生/その他/卒業生
  currentOrg?: string; // 卒業生の現在の所属
  gender?: string; // 性別
  birthDate?: string; // 誕生日 (YYYY-MM-DD)
  ringColor?: string; // リングカラーキー
  interests?: string[]; // 興味分野タグ
  topInterests?: string[]; // 一覧表示用Top 3
};

// リングカラーパレット定数（Tailwind content scan 対象のためここに定義）
export const RING_COLORS = [
  {
    key: "purple",
    label: "パープル",
    ring: "ring-purple-400",
    bg: "bg-purple-400",
  },
  { key: "blue", label: "ブルー", ring: "ring-blue-400", bg: "bg-blue-400" },
  {
    key: "green",
    label: "グリーン",
    ring: "ring-green-400",
    bg: "bg-green-400",
  },
  { key: "pink", label: "ピンク", ring: "ring-pink-400", bg: "bg-pink-400" },
  {
    key: "orange",
    label: "オレンジ",
    ring: "ring-orange-400",
    bg: "bg-orange-400",
  },
  { key: "red", label: "レッド", ring: "ring-red-400", bg: "bg-red-400" },
  { key: "teal", label: "ティール", ring: "ring-teal-400", bg: "bg-teal-400" },
  {
    key: "amber",
    label: "アンバー",
    ring: "ring-amber-400",
    bg: "bg-amber-400",
  },
  { key: "rose", label: "ローズ", ring: "ring-rose-400", bg: "bg-rose-400" },
  {
    key: "indigo",
    label: "インディゴ",
    ring: "ring-indigo-400",
    bg: "bg-indigo-400",
  },
] as const;

export type RingColorKey = (typeof RING_COLORS)[number]["key"];
export const DEFAULT_RING_COLOR: RingColorKey = "purple";

export function getRingColorClass(key?: string): string {
  return RING_COLORS.find((c) => c.key === key)?.ring ?? "ring-purple-400";
}

/**
 * バッジに表示するラベルを返す。
 * 学部生/院生 → 学年テキストそのまま（例: "学部3年", "修士2年"）
 * その他 → "その他 X年"
 * 卒業生 → "卒業生"
 */
export function getMemberTypeBadgeLabel(
  memberType?: string,
  year?: string,
): string {
  if (!memberType) return "";
  switch (memberType) {
    case "学部生":
    case "院生":
      return year || memberType;
    case "その他":
      return year ? `その他 ${year}` : memberType;
    default:
      return memberType;
  }
}

export function getTileDisplay(member: { name: string; nickname?: string }) {
  if (member.nickname && member.nickname !== member.name) {
    return { main: member.nickname, sub: member.name };
  }
  return { main: member.name, sub: undefined };
}

export function getMemberTypeBadgeClass(type: string): string {
  switch (type) {
    case "学部生":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "院生":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "卒業生":
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    case "その他":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
