import { getDb } from '@/lib/firebase'
import type { Member } from '@/types/member'
import { FieldValue } from 'firebase-admin/firestore'

export interface MemberDocument {
  discordUsername: string
  discordAvatar: string
  studentId: string
  nickname: string
  lastName: string
  firstName: string
  faculty: string
  bio: string
  role?: string
  year?: string
  skills?: string[]
  github?: string
  githubId?: string
  x?: string
  xId?: string
  line?: string
  lineId?: string
  visibility: {
    studentId: boolean
    nickname: boolean
    lastName: boolean
    firstName: boolean
    faculty: boolean
    bio: boolean
    github: boolean
    x: boolean
    line: boolean
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
      faculty: '',
      bio: '',
      visibility: {
        studentId: false,
        nickname: true,
        lastName: false,
        firstName: false,
        faculty: false,
        bio: true,
        github: false,
        x: false,
        line: false,
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

export async function getMember(discordId: string): Promise<MemberDocument | null> {
  const db = getDb()
  const snap = await db.collection('members').doc(discordId).get()
  if (!snap.exists) return null
  return snap.data() as MemberDocument
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
  data: Partial<Pick<MemberDocument, 'github' | 'githubId' | 'x' | 'xId' | 'line' | 'lineId'>>
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
  }
  await db.collection('members').doc(discordId).update(updates)
}

export function profileToMember(discordId: string, data: MemberDocument): Member {
  const v = data.visibility

  const displayName =
    (v.lastName && v.firstName)
      ? `${data.lastName} ${data.firstName}`
      : v.nickname
      ? data.nickname
      : data.discordUsername

  const social: Member['social'] = {}
  if (v.github && data.github) social.github = `https://github.com/${data.github}`
  if (v.x && data.x) social.x = `https://x.com/${data.x}`

  return {
    id: discordId,
    name: displayName,
    role: data.role ?? '',
    department: v.faculty ? data.faculty : '',
    year: data.year ?? '',
    bio: v.bio ? data.bio : '',
    skills: data.skills ?? [],
    image: data.discordAvatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${data.discordAvatar}.png`
      : '/placeholder.svg',
    social: Object.keys(social).length > 0 ? social : undefined,
  }
}
