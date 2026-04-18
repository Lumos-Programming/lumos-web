import { getDb } from "@/lib/firebase";
import type { Member } from "@/types/member";
import type {
  VisibilityLevel,
  MemberType,
  EnrollmentRecord,
} from "@/types/profile";
import { FieldValue } from "firebase-admin/firestore";

export const PUBLIC_IMAGE_OPTIONS = [
  "face",
  "discord",
  "line",
  "custom",
  "default",
] as const;
export type PublicImageOption = (typeof PUBLIC_IMAGE_OPTIONS)[number];

export interface MemberDocument {
  discordUsername: string; // Display name (token.name)
  discordHandle?: string; // Discord username (@handle)
  discordAvatar: string;
  studentId: string;
  nickname: string;
  lastName: string;
  firstName: string;
  lastNameRomaji?: string;
  firstNameRomaji?: string;
  bio: string;
  role?: string;
  yearByFiscal?: Record<string, string>;
  memberType?: MemberType;
  enrollments?: EnrollmentRecord[];
  currentOrg?: string; // 卒業生の現在の所属
  birthDate?: string; // YYYY-MM-DD
  gender?: string;
  github?: string;
  githubId?: string;
  githubAvatar?: string;
  x?: string;
  xId?: string;
  xAvatar?: string;
  line?: string;
  lineId?: string;
  lineAvatar?: string;
  linkedin?: string; // LinkedIn profile URL (manually entered)
  lineLinkedAt?: number; // Unix timestamp (seconds) — LINE連携日時
  lineAccessToken?: string;
  lineRefreshToken?: string;
  lineTokenExpiresAt?: number; // Unix timestamp (seconds)
  faceImage?: string; // GCS URL (顔写真)
  bannerImage?: string; // GCS URL (プロフィールバナー画像)
  customPublicImage?: string; // GCS URL (カスタム公開画像)
  publicImageOption?: PublicImageOption; // 公開ページ用
  ringColor?: string; // リングカラーキー
  interests?: string[]; // 興味分野タグ
  topInterests?: string[]; // 一覧カード表示用 (max 3)
  allowPublic?: boolean;
  onboardingCompleted?: boolean;
  optedOut?: boolean;
  optedOutAt?: FirebaseFirestore.Timestamp;
  visibility: {
    studentId: VisibilityLevel;
    nickname: VisibilityLevel;
    lastName: VisibilityLevel;
    firstName: VisibilityLevel;
    faculty: VisibilityLevel;
    currentOrg: VisibilityLevel;
    birthDate: VisibilityLevel;
    gender: VisibilityLevel;
    bio: VisibilityLevel;
    github: VisibilityLevel;
    x: VisibilityLevel;
    linkedin: VisibilityLevel;
    line: VisibilityLevel;
    discord: VisibilityLevel;
  };
  lastLoginAt?: FirebaseFirestore.Timestamp;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export async function getOrCreateMember(
  discordId: string,
  username: string,
  avatar: string,
  handle?: string,
): Promise<{ isNewMember: boolean; lastLoginAt: Date | null }> {
  const db = getDb();
  const ref = db.collection("members").doc(discordId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      discordUsername: username,
      ...(handle ? { discordHandle: handle } : {}),
      discordAvatar: avatar,
      studentId: "",
      nickname: "",
      lastName: "",
      firstName: "",
      lastNameRomaji: "",
      firstNameRomaji: "",
      bio: "",
      allowPublic: true,
      visibility: {
        studentId: "private",
        nickname: "public",
        lastName: "public",
        firstName: "public",
        faculty: "public",
        currentOrg: "public",
        birthDate: "internal",
        gender: "internal",
        bio: "public",
        github: "public",
        x: "public",
        linkedin: "public",
        line: "internal",
        discord: "public",
      },
      lastLoginAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { isNewMember: true, lastLoginAt: null };
  } else {
    const data = snap.data() as MemberDocument;
    const lastLoginAt = data.lastLoginAt?.toDate() ?? null;
    await ref.update({
      discordUsername: username,
      ...(handle ? { discordHandle: handle } : {}),
      discordAvatar: avatar,
      lastLoginAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { isNewMember: false, lastLoginAt };
  }
}

export async function getPublicMembers(): Promise<Member[]> {
  const db = getDb();
  const snap = await db
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .where("allowPublic", "==", true)
    .get();

  return snap.docs.flatMap((doc) => {
    const data = doc.data() as MemberDocument;
    if (isMemberOptedOut(data)) return [];
    return [profileToMember(doc.id, data)];
  });
}

export async function getMembersInternal(): Promise<Member[]> {
  const db = getDb();
  const snap = await db
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .get();

  return snap.docs.flatMap((doc) => {
    const data = doc.data() as MemberDocument;
    if (isMemberOptedOut(data)) return [];
    return [profileToMemberInternal(doc.id, data)];
  });
}

export async function getMember(
  discordId: string,
): Promise<MemberDocument | null> {
  const db = getDb();
  const snap = await db.collection("members").doc(discordId).get();
  if (!snap.exists) return null;
  return snap.data() as MemberDocument;
}

export async function getMemberInternal(
  discordId: string,
): Promise<Member | null> {
  const db = getDb();
  const snap = await db.collection("members").doc(discordId).get();
  if (!snap.exists) return null;
  return profileToMemberInternal(discordId, snap.data() as MemberDocument);
}

export async function updateMember(
  discordId: string,
  data: Partial<
    Omit<
      MemberDocument,
      | "discordUsername"
      | "discordAvatar"
      | "github"
      | "githubId"
      | "x"
      | "xId"
      | "line"
      | "lineId"
      | "createdAt"
      | "updatedAt"
    >
  >,
): Promise<void> {
  const db = getDb();
  await db
    .collection("members")
    .doc(discordId)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function updateMemberSns(
  discordId: string,
  data: Partial<
    Pick<
      MemberDocument,
      | "github"
      | "githubId"
      | "githubAvatar"
      | "x"
      | "xId"
      | "xAvatar"
      | "linkedin"
      | "line"
      | "lineId"
      | "lineAvatar"
      | "lineLinkedAt"
      | "lineAccessToken"
      | "lineRefreshToken"
      | "lineTokenExpiresAt"
    >
  >,
): Promise<void> {
  const db = getDb();
  await db
    .collection("members")
    .doc(discordId)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteMemberSnsField(
  discordId: string,
  provider: "github" | "x" | "line" | "linkedin",
): Promise<void> {
  const db = getDb();
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    [provider]: FieldValue.delete(),
  };
  if (provider !== "linkedin") {
    updates[`${provider}Id`] = FieldValue.delete();
    updates[`${provider}Avatar`] = FieldValue.delete();
  }
  if (provider === "line") {
    updates.lineAccessToken = FieldValue.delete();
    updates.lineRefreshToken = FieldValue.delete();
    updates.lineTokenExpiresAt = FieldValue.delete();
  }
  await db.collection("members").doc(discordId).update(updates);
}

export function isOnboardingComplete(member: MemberDocument): boolean {
  return member.onboardingCompleted === true;
}

export function isMemberOptedOut(member: MemberDocument | null): boolean {
  return member?.optedOut === true;
}

/** discordId から直接退会済みかを判定する (members コレクションが source of truth) */
export async function isDiscordIdOptedOut(discordId: string): Promise<boolean> {
  const member = await getMember(discordId);
  return isMemberOptedOut(member);
}

/**
 * 退会フラグを立てる。member doc が無い場合は最小限のドキュメントを作成する。
 * 未ログインのまま Discord DM のリンクだけで退会するユーザーも、以後の登録案内 DM から
 * 除外できるようにするため存在を記録する。
 */
export async function markMemberOptedOut(discordId: string): Promise<void> {
  const db = getDb();
  const ref = db.collection("members").doc(discordId);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({
      optedOut: true,
      optedOutAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }
  // メンバーが会員登録そもそもしていない場合
  await ref.set({
    optedOut: true,
    optedOutAt: FieldValue.serverTimestamp(),
    onboardingCompleted: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** 再加入時: 退会フラグを解除し、オンボーディングをやり直させる */
export async function markMemberRejoined(discordId: string): Promise<void> {
  const db = getDb();
  const ref = db.collection("members").doc(discordId);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.update({
    optedOut: FieldValue.delete(),
    optedOutAt: FieldValue.delete(),
    onboardingCompleted: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export type MemberRegistrationStatus = {
  registeredIds: Set<string>;
  onboardingIds: Set<string>;
  optedOutIds: Set<string>;
};

export async function getMemberRegistrationStatus(): Promise<MemberRegistrationStatus> {
  const db = getDb();
  const snap = await db
    .collection("members")
    .select("onboardingCompleted", "optedOut")
    .get();

  const registeredIds = new Set<string>();
  const onboardingIds = new Set<string>();
  const optedOutIds = new Set<string>();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.optedOut === true) {
      optedOutIds.add(doc.id);
      continue;
    }
    if (data.onboardingCompleted === true) {
      registeredIds.add(doc.id);
    } else {
      onboardingIds.add(doc.id);
    }
  }

  return { registeredIds, onboardingIds, optedOutIds };
}

function resolveDiscordAvatar(
  discordId: string,
  discordAvatar?: string,
): string {
  if (!discordAvatar) return "/placeholder.svg";
  // Already a full URL (stored from token.picture)
  if (discordAvatar.startsWith("http")) return discordAvatar;
  // Legacy: hash only
  return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`;
}

const DEFAULT_AVATAR = "/assets/lumos_logo-full.png";

function resolvePublicImage(discordId: string, data: MemberDocument): string {
  switch (data.publicImageOption ?? "face") {
    case "face":
      return data.faceImage || DEFAULT_AVATAR;
    case "discord":
      return resolveDiscordAvatar(discordId, data.discordAvatar);
    case "line":
      return data.lineAvatar || DEFAULT_AVATAR;
    case "custom":
      return data.customPublicImage || DEFAULT_AVATAR;
    case "default":
      return DEFAULT_AVATAR;
  }
}

function getInitials(data: MemberDocument): string {
  const f = data.firstNameRomaji?.trim();
  const l = data.lastNameRomaji?.trim();
  if (f && l) return `${f[0].toUpperCase()}. ${l[0].toUpperCase()}.`;
  return "";
}

export function profileToMember(
  discordId: string,
  data: MemberDocument,
): Member {
  const v = data.visibility;

  const displayName =
    v.lastName === "public" && v.firstName === "public"
      ? `${data.lastName} ${data.firstName}`
      : v.nickname === "public"
        ? data.nickname
        : getInitials(data) || data.discordUsername;

  const social: Member["social"] = {};
  if (v.github === "public" && data.github) {
    social.github = `https://github.com/${data.github}`;
    if (data.githubAvatar) social.githubAvatar = data.githubAvatar;
  }
  if (v.x === "public" && data.x) {
    social.x = `https://x.com/${data.x}`;
    if (data.xAvatar) social.xAvatar = data.xAvatar;
  }
  if (v.linkedin === "public" && data.linkedin) social.linkedin = data.linkedin;
  // 外部向け: Discord chipには @discordHandle を表示
  if (v.discord === "public" && data.discordHandle) {
    social.discord = `https://discord.com/users/${discordId}`;
    social.discordUsername = `@${data.discordHandle}`;
    const avatar = resolveDiscordAvatar(discordId, data.discordAvatar);
    if (avatar !== "/placeholder.svg") social.discordAvatar = avatar;
  }

  const currentFaculty =
    data.enrollments?.find((e) => e.isCurrent)?.faculty ?? "";

  return {
    id: discordId,
    name: displayName,
    role: data.role ?? "",
    department: v.faculty === "public" ? currentFaculty : "",
    year: data.yearByFiscal?.[String(new Date().getFullYear())] ?? "",
    bio: v.bio === "public" ? data.bio : "",
    publicImage: resolvePublicImage(discordId, data),
    social: Object.keys(social).length > 0 ? social : undefined,
    nickname: v.nickname === "public" ? data.nickname || undefined : undefined,
    memberType: data.memberType,
    currentOrg:
      v.currentOrg === "public" ? data.currentOrg || undefined : undefined,
    gender: v.gender === "public" ? data.gender || undefined : undefined,
    ringColor: data.ringColor,
    interests: data.interests ?? [],
    topInterests: data.topInterests ?? [],
  };
}

const RELINK_COOLDOWN_SECONDS = 14 * 24 * 60 * 60; // 14 days

export function isLineRelinkCooldownActive(lineLinkedAt?: number): boolean {
  if (!lineLinkedAt) return false;
  return Math.floor(Date.now() / 1000) - lineLinkedAt < RELINK_COOLDOWN_SECONDS;
}

export function profileToMemberInternal(
  discordId: string,
  data: MemberDocument,
): Member {
  const v = data.visibility;

  const displayName =
    v.lastName !== "private" && v.firstName !== "private"
      ? `${data.lastName} ${data.firstName}`
      : v.nickname !== "private"
        ? data.nickname
        : getInitials(data) || data.discordUsername;

  const social: Member["social"] = {};
  if (v.github !== "private" && data.github) {
    social.github = `https://github.com/${data.github}`;
    if (data.githubAvatar) social.githubAvatar = data.githubAvatar;
  }
  if (v.x !== "private" && data.x) {
    social.x = `https://x.com/${data.x}`;
    if (data.xAvatar) social.xAvatar = data.xAvatar;
  }
  if (v.linkedin !== "private" && data.linkedin)
    social.linkedin = data.linkedin;
  // 内部向け: Discord chipには discordUsername（表示名）を優先表示
  if (v.discord !== "private") {
    social.discord = `https://discord.com/users/${discordId}`;
    social.discordUsername = data.discordUsername || data.discordHandle;
    const avatar = resolveDiscordAvatar(discordId, data.discordAvatar);
    if (avatar !== "/placeholder.svg") social.discordAvatar = avatar;
  }
  if (v.line !== "private" && data.line) {
    social.line = data.line;
    if (data.lineAvatar) social.lineAvatar = data.lineAvatar;
  }

  const currentFaculty =
    data.enrollments?.find((e) => e.isCurrent)?.faculty ?? "";

  // SNS avatar for overlay (prefer Discord, fallback to LINE)
  const snsAvatar =
    resolveDiscordAvatar(discordId, data.discordAvatar) !== "/placeholder.svg"
      ? resolveDiscordAvatar(discordId, data.discordAvatar)
      : data.lineAvatar || undefined;

  return {
    id: discordId,
    name: displayName,
    role: data.role ?? "",
    department: v.faculty !== "private" ? currentFaculty : "",
    year: data.yearByFiscal?.[String(new Date().getFullYear())] ?? "",
    bio: v.bio !== "private" ? data.bio : "",
    publicImage: data.faceImage || DEFAULT_AVATAR,
    faceImage: data.faceImage || undefined,
    snsAvatar,
    social: Object.keys(social).length > 0 ? social : undefined,
    nickname: v.nickname !== "private" ? data.nickname || undefined : undefined,
    memberType: data.memberType,
    currentOrg:
      v.currentOrg !== "private" ? data.currentOrg || undefined : undefined,
    gender: v.gender !== "private" ? data.gender || undefined : undefined,
    birthDate:
      v.birthDate !== "private" ? data.birthDate || undefined : undefined,
    ringColor: data.ringColor,
    interests: data.interests ?? [],
    topInterests: data.topInterests ?? [],
  };
}
