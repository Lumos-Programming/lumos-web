export interface ProfileVisibility {
  studentId: boolean
  nickname: boolean
  lastName: boolean
  firstName: boolean
  faculty: boolean
  bio: boolean
  line: boolean
  discord: boolean
  github: boolean
  x: boolean
}

export interface Profile {
  studentId: string
  nickname: string
  lastName: string
  firstName: string
  faculty: string
  bio: string
  line: string
  discord: string
  github: string
  x: string
  role?: string
  year?: string
  skills?: string[]
  visibility: ProfileVisibility
}

export const FACULTIES = ["理工学部", "都市科学部", "経済学部", "経営学部", "教育学部"] as const
