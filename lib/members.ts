import { getDb } from '@/lib/firebase'
import type { Member } from '@/types/member'
import type { VisibilityLevel, MemberType, EnrollmentRecord } from '@/types/profile'
import { FieldValue } from 'firebase-admin/firestore'

export interface MemberDocument {
  discordUsername: string
  discordAvatar: string
  studentId: string
  nickname: string
  lastName: string
  firstName: string
  lastNameRomaji?: string
  firstNameRomaji?: string
  bio: string
  role?: string
  yearByFiscal?: Record<string, string>
  memberType?: MemberType
  enrollments?: EnrollmentRecord[]
  currentOrg?: string        // 卒業生の現在の所属
  birthDate?: string         // YYYY-MM-DD
  skills?: string[]
  github?: string
  githubId?: string
  githubAvatar?: string
  x?: string
  xId?: string
  xAvatar?: string
  line?: string
  lineId?: string
  lineAvatar?: string
  linkedin?: string
  linkedinId?: string
  linkedinAvatar?: string
  lineAccessToken?: string
  lineRefreshToken?: string
  lineTokenExpiresAt?: number   // Unix timestamp (seconds)
  faceImage?: string            // GCS URL (顔写真)
  primaryAvatar?: 'face' | 'discord' | 'line' | 'default'  // 公開ページ用
  ringColor?: string            // リングカラーキー
  allowPublic?: boolean
  onboardingCompleted?: boolean
  visibility: {
    studentId: VisibilityLevel
    nickname: VisibilityLevel
    lastName: VisibilityLevel
    firstName: VisibilityLevel
    faculty: VisibilityLevel
    currentOrg: VisibilityLevel
    birthDate: VisibilityLevel
    bio: VisibilityLevel
    github: VisibilityLevel
    x: VisibilityLevel
    linkedin: VisibilityLevel
    line: VisibilityLevel
    discord: VisibilityLevel
  }
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}

export async function getOrCreateMember(
  discordId: string,
  username: string,
  avatar: string
): Promise<void> {
  const db = getDb()
  const ref = db.collection('members').doc(discordId)
  const snap = await ref.get()

  if (!snap.exists) {
    await ref.set({
      discordUsername: username,
      discordAvatar: avatar,
      studentId: '',
      nickname: '',
      lastName: '',
      firstName: '',
      lastNameRomaji: '',
      firstNameRomaji: '',
      bio: '',
      allowPublic: true,
      visibility: {
        studentId: 'private',
        nickname: 'public',
        lastName: 'public',
        firstName: 'public',
        faculty: 'public',
        currentOrg: 'public',
        birthDate: 'internal',
        bio: 'public',
        github: 'public',
        x: 'public',
        linkedin: 'public',
        line: 'internal',
        discord: 'public',
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  } else {
    await ref.update({
      discordUsername: username,
      discordAvatar: avatar,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
}

export async function getMembers(): Promise<Member[]> {
  const db = getDb()
  const snap = await db.collection('members').get()

  return snap.docs.map((doc) => {
    const data = doc.data() as MemberDocument
    return profileToMember(doc.id, data)
  })
}

export async function getMembersInternal(): Promise<Member[]> {
  const db = getDb()
  const snap = await db.collection('members').get()

  return snap.docs.map((doc) => {
    const data = doc.data() as MemberDocument
    return profileToMemberInternal(doc.id, data)
  })
}

export async function getMember(discordId: string): Promise<MemberDocument | null> {
  const db = getDb()
  const snap = await db.collection('members').doc(discordId).get()
  if (!snap.exists) return null
  return snap.data() as MemberDocument
}

export async function getMemberInternal(discordId: string): Promise<Member | null> {
  const db = getDb()
  const snap = await db.collection('members').doc(discordId).get()
  if (!snap.exists) return null
  return profileToMemberInternal(discordId, snap.data() as MemberDocument)
}

export async function updateMember(
  discordId: string,
  data: Partial<Omit<MemberDocument, 'discordUsername' | 'discordAvatar' | 'github' | 'githubId' | 'x' | 'xId' | 'linkedin' | 'linkedinId' | 'line' | 'lineId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getDb()
  await db.collection('members').doc(discordId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function updateMemberSns(
  discordId: string,
  data: Partial<Pick<MemberDocument, 'github' | 'githubId' | 'githubAvatar' | 'x' | 'xId' | 'xAvatar' | 'linkedin' | 'linkedinId' | 'linkedinAvatar' | 'line' | 'lineId' | 'lineAvatar' | 'lineAccessToken' | 'lineRefreshToken' | 'lineTokenExpiresAt'>>
): Promise<void> {
  const db = getDb()
  await db.collection('members').doc(discordId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function deleteMemberSnsField(
  discordId: string,
  provider: 'github' | 'x' | 'line' | 'linkedin'
): Promise<void> {
  const db = getDb()
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    [provider]: FieldValue.delete(),
    [`${provider}Id`]: FieldValue.delete(),
    [`${provider}Avatar`]: FieldValue.delete(),
  }
  if (provider === 'line') {
    updates.lineAccessToken = FieldValue.delete()
    updates.lineRefreshToken = FieldValue.delete()
    updates.lineTokenExpiresAt = FieldValue.delete()
  }
  await db.collection('members').doc(discordId).update(updates)
}

export function isOnboardingComplete(member: MemberDocument): boolean {
  return member.onboardingCompleted === true
}

function resolveDiscordAvatar(discordId: string, discordAvatar?: string): string {
  if (!discordAvatar) return '/placeholder.svg'
  // Already a full URL (stored from token.picture)
  if (discordAvatar.startsWith('http')) return discordAvatar
  // Legacy: hash only
  return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`
}

function resolvePrimaryAvatar(discordId: string, data: MemberDocument): string {
  const pa = data.primaryAvatar ?? 'face'
  switch (pa) {
    case 'face':
      return data.faceImage || resolveDiscordAvatar(discordId, data.discordAvatar)
    case 'discord':
      return resolveDiscordAvatar(discordId, data.discordAvatar)
    case 'line':
      return data.lineAvatar || '/placeholder.svg'
    case 'default':
      return '/placeholder.svg'
  }
}

function getInitials(data: MemberDocument): string {
  const f = data.firstNameRomaji?.trim()
  const l = data.lastNameRomaji?.trim()
  if (f && l) return `${f[0].toUpperCase()}. ${l[0].toUpperCase()}.`
  return ''
}

export function profileToMember(discordId: string, data: MemberDocument): Member {
  const v = data.visibility

  const displayName =
    (v.lastName === 'public' && v.firstName === 'public')
      ? `${data.lastName} ${data.firstName}`
      : v.nickname === 'public'
      ? data.nickname
      : getInitials(data) || data.discordUsername

  const social: Member['social'] = {}
  if (v.github === 'public' && data.github) social.github = `https://github.com/${data.github}`
  if (v.x === 'public' && data.x) social.x = `https://x.com/${data.x}`
  if (v.linkedin === 'public' && data.linkedin) social.linkedin = `https://www.linkedin.com/in/${data.linkedinId}`
  if (v.discord === 'public') social.discord = data.discordUsername

  const currentFaculty = data.enrollments?.find(e => e.isCurrent)?.faculty ?? ''

  return {
    id: discordId,
    name: displayName,
    role: data.role ?? '',
    department: v.faculty === 'public' ? currentFaculty : '',
    year: data.yearByFiscal?.[String(new Date().getFullYear())] ?? '',
    bio: v.bio === 'public' ? data.bio : '',
    skills: data.skills ?? [],
    image: resolvePrimaryAvatar(discordId, data),
    social: Object.keys(social).length > 0 ? social : undefined,
    nickname: v.nickname === 'public' ? data.nickname || undefined : undefined,
    memberType: data.memberType,
    currentOrg: v.currentOrg === 'public' ? data.currentOrg || undefined : undefined,
    ringColor: data.ringColor,
  }
}

export function profileToMemberInternal(discordId: string, data: MemberDocument): Member {
  const v = data.visibility

  const displayName =
    (v.lastName !== 'private' && v.firstName !== 'private')
      ? `${data.lastName} ${data.firstName}`
      : v.nickname !== 'private'
      ? data.nickname
      : getInitials(data) || data.discordUsername

  const social: Member['social'] = {}
  if (v.github !== 'private' && data.github) social.github = `https://github.com/${data.github}`
  if (v.x !== 'private' && data.x) social.x = `https://x.com/${data.x}`
  if (v.linkedin !== 'private' && data.linkedin) social.linkedin = `https://www.linkedin.com/in/${data.linkedinId}`
  if (v.discord !== 'private') social.discord = data.discordUsername

  const currentFaculty = data.enrollments?.find(e => e.isCurrent)?.faculty ?? ''

  // SNS avatar for overlay (prefer Discord, fallback to LINE)
  const snsAvatar = resolveDiscordAvatar(discordId, data.discordAvatar) !== '/placeholder.svg'
    ? resolveDiscordAvatar(discordId, data.discordAvatar)
    : data.lineAvatar || undefined

  return {
    id: discordId,
    name: displayName,
    role: data.role ?? '',
    department: v.faculty !== 'private' ? currentFaculty : '',
    year: data.yearByFiscal?.[String(new Date().getFullYear())] ?? '',
    bio: v.bio !== 'private' ? data.bio : '',
    skills: data.skills ?? [],
    image: resolveDiscordAvatar(discordId, data.discordAvatar),
    faceImage: data.faceImage || undefined,
    snsAvatar,
    social: Object.keys(social).length > 0 ? social : undefined,
    nickname: v.nickname !== 'private' ? data.nickname || undefined : undefined,
    memberType: data.memberType,
    currentOrg: v.currentOrg !== 'private' ? data.currentOrg || undefined : undefined,
    ringColor: data.ringColor,
  }
}
