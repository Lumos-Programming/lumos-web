export type Member = {
  id: number
  name: string
  role: string
  department: string
  year: string
  bio: string
  skills: string[]
  image: string
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
    website?: string
  }
};