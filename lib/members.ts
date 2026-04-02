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
  lineAccessToken?: string
  lineRefreshToken?: string
  lineTokenExpiresAt?: number   // Unix timestamp (seconds)
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
  data: Partial<Omit<MemberDocument, 'discordUsername' | 'discordAvatar' | 'github' | 'githubId' | 'x' | 'xId' | 'line' | 'lineId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getDb()
  await db.collection('members').doc(discordId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function updateMemberSns(
  discordId: string,
  data: Partial<Pick<MemberDocument, 'github' | 'githubId' | 'githubAvatar' | 'x' | 'xId' | 'xAvatar' | 'line' | 'lineId' | 'lineAvatar' | 'lineAccessToken' | 'lineRefreshToken' | 'lineTokenExpiresAt'>>
): Promise<void> {
  const db = getDb()
  await db.collection('members').doc(discordId).update({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function deleteMemberSnsField(
  discordId: string,
  provider: 'github' | 'x' | 'line'
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

export function profileToMember(discordId: string, data: MemberDocument): Member {
  const v = data.visibility

  const displayName =
    (v.lastName === 'public' && v.firstName === 'public')
      ? `${data.lastName} ${data.firstName}`
      : v.nickname === 'public'
      ? data.nickname
      : data.discordUsername

  const social: Member['social'] = {}
  if (v.github === 'public' && data.github) social.github = `https://github.com/${data.github}`
  if (v.x === 'public' && data.x) social.x = `https://x.com/${data.x}`
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
    image: data.discordAvatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${data.discordAvatar}.png`
      : '/placeholder.svg',
    social: Object.keys(social).length > 0 ? social : undefined,
  }
}

export function profileToMemberInternal(discordId: string, data: MemberDocument): Member {
  const v = data.visibility

  const displayName =
    (v.lastName !== 'private' && v.firstName !== 'private')
      ? `${data.lastName} ${data.firstName}`
      : v.nickname !== 'private'
      ? data.nickname
      : data.discordUsername

  const social: Member['social'] = {}
  if (v.github !== 'private' && data.github) social.github = `https://github.com/${data.github}`
  if (v.x !== 'private' && data.x) social.x = `https://x.com/${data.x}`
  if (v.discord !== 'private') social.discord = data.discordUsername

  const currentFaculty = data.enrollments?.find(e => e.isCurrent)?.faculty ?? ''

  return {
    id: discordId,
    name: displayName,
    role: data.role ?? '',
    department: v.faculty !== 'private' ? currentFaculty : '',
    year: data.yearByFiscal?.[String(new Date().getFullYear())] ?? '',
    bio: v.bio !== 'private' ? data.bio : '',
    skills: data.skills ?? [],
    image: data.discordAvatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${data.discordAvatar}.png`
      : '/placeholder.svg',
    social: Object.keys(social).length > 0 ? social : undefined,
  }
}
