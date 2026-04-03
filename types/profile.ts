export type VisibilityLevel = 'private' | 'internal' | 'public'

export interface ProfileVisibility {
  studentId: VisibilityLevel  // 常に 'private' 固定
  nickname: VisibilityLevel
  lastName: VisibilityLevel
  firstName: VisibilityLevel
  faculty: VisibilityLevel
  currentOrg: VisibilityLevel
  birthDate: VisibilityLevel
  gender: VisibilityLevel
  bio: VisibilityLevel
  line: VisibilityLevel       // 最大 'internal'
  github: VisibilityLevel
  x: VisibilityLevel
  linkedin: VisibilityLevel
  discord: VisibilityLevel
}

export interface EnrollmentRecord {
  faculty: string
  admissionYear: string
  enrollmentType: EnrollmentType
  transferYear?: string   // 編入時のみ
  isCurrent: boolean
}

export interface Profile {
  studentId: string
  nickname: string
  lastName: string
  firstName: string
  lastNameRomaji: string
  firstNameRomaji: string
  enrollments?: EnrollmentRecord[]
  currentOrg?: string      // 卒業生の現在の所属
  birthDate?: string       // YYYY-MM-DD
  gender?: string
  bio: string
  line: string
  discord: string
  github: string
  x: string
  role?: string
  year?: string
  skills?: string[]
  interests?: string[]
  topInterests?: string[]
  visibility: ProfileVisibility
}

export const GENDER_OPTIONS = ["男性", "女性", "その他"] as const

export const MEMBER_TYPES = ["学部生", "院生", "聴講生", "卒業生"] as const
export type MemberType = typeof MEMBER_TYPES[number]

export const ENROLLMENT_TYPES = ["入学", "編入"] as const
export type EnrollmentType = typeof ENROLLMENT_TYPES[number]

export const ADMISSION_YEARS = Array.from(
  { length: new Date().getFullYear() - 2019 + 1 },
  (_, i) => String(new Date().getFullYear() - i)
)

export const FACULTIES = ["教育学部", "経済学部", "経営学部", "理工学部", "都市科学部"] as const
export const GRADUATE_SCHOOLS = ["教育学研究科", "国際社会科学府", "理工学府", "環境情報学府", "都市イノベーション学府"] as const

export function getFacultyOptions(memberType: MemberType | ""): { label: string; options: readonly string[] } {
  switch (memberType) {
    case "学部生":
      return { label: "所属学部", options: FACULTIES }
    case "院生":
      return { label: "所属学府", options: GRADUATE_SCHOOLS }
    case "聴講生":
      return { label: "所属学部/学府", options: [...FACULTIES, ...GRADUATE_SCHOOLS] }
    case "卒業生":
      return { label: "最終所属学部/学府", options: [...FACULTIES, ...GRADUATE_SCHOOLS] }
    default:
      return { label: "所属学部/学府", options: [] }
  }
}
