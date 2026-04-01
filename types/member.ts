export type Member = {
  id: string  // discordId
  name: string
  role: string
  department: string
  year: string
  bio: string
  skills: string[]
  image: string
  social?: {
    x?: string
    github?: string
    linkedin?: string
    website?: string
  }
};
