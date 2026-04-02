export type Member = {
  id: string  // discordId
  name: string
  role: string
  department: string
  year: string
  bio: string
  skills: string[]
  image: string
  faceImage?: string   // GCS URL (顔写真)
  snsAvatar?: string   // Discord or LINE アバター (内部メンバー表示用)
  social?: {
    x?: string
    github?: string
    discord?: string
    linkedin?: string
    website?: string
  }
};
