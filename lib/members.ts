import { getDb } from "@/lib/firebase";
import type { Member } from "@/types/member";
import type {
  VisibilityLevel,
  MemberType,
  EnrollmentRecord,
} from "@/types/profile";
import { FieldValue } from "firebase-admin/firestore";

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
  lineAccessToken?: string;
  lineRefreshToken?: string;
  lineTokenExpiresAt?: number; // Unix timestamp (seconds)
  faceImage?: string; // GCS URL (顔写真)
  bannerImage?: string; // GCS URL (プロフィールバナー画像)
  primaryAvatar?: "face" | "discord" | "line" | "default"; // 公開ページ用
  ringColor?: string; // リングカラーキー
  interests?: string[]; // 興味分野タグ
  topInterests?: string[]; // 一覧カード表示用 (max 3)
  allowPublic?: boolean;
  onboardingCompleted?: boolean;
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
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export async function getOrCreateMember(
  discordId: string,
  username: string,
  avatar: string,
  handle?: string,
): Promise<void> {
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await ref.update({
      discordUsername: username,
      ...(handle ? { discordHandle: handle } : {}),
      discordAvatar: avatar,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function getPublicMembers(): Promise<Member[]> {
  const db = getDb();
  const snap = await db
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .where("allowPublic", "==", true)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as MemberDocument;
    return profileToMember(doc.id, data);
  });
}

export async function getMembersInternal(): Promise<Member[]> {
  const db = getDb();
  const snap = await db
    .collection("members")
    .where("onboardingCompleted", "==", true)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as MemberDocument;
    return profileToMemberInternal(doc.id, data);
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

function resolvePrimaryAvatar(discordId: string, data: MemberDocument): string {
  const pa = data.primaryAvatar ?? "face";
  switch (pa) {
    case "face":
      return (
        data.faceImage || resolveDiscordAvatar(discordId, data.discordAvatar)
      );
    case "discord":
      return resolveDiscordAvatar(discordId, data.discordAvatar);
    case "line":
      return data.lineAvatar || "/placeholder.svg";
    case "default":
      return "/placeholder.svg";
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
    image: resolvePrimaryAvatar(discordId, data),
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
    image: resolveDiscordAvatar(discordId, data.discordAvatar),
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
