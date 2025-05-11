"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Github, Twitter, Linkedin, Globe } from "lucide-react"
import Link from "next/link"

type Member = {
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
}

const members: Member[] = [
  {
    id: 1,
    name: "佐藤 太郎",
    role: "代表",
    department: "理工学部 情報工学科",
    year: "4年",
    bio: "プログラミングサークルLumosの代表を務めています。ウェブ開発とAIに興味があり、卒業後はIT企業でのキャリアを目指しています。趣味は読書とバスケットボールです。",
    skills: ["JavaScript", "React", "Python", "TensorFlow"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      twitter: "https://twitter.com/satotaro",
      github: "https://github.com/satotaro",
      linkedin: "https://linkedin.com/in/satotaro",
      website: "https://satotaro.dev",
    },
  },
  {
    id: 2,
    name: "鈴木 花子",
    role: "副代表",
    department: "経営学部 経営学科",
    year: "3年",
    bio: "副代表として、主にイベント企画と運営を担当しています。プログラミングは大学から始めましたが、今ではフロントエンド開発が得意です。趣味は旅行と写真撮影です。",
    skills: ["HTML/CSS", "JavaScript", "Vue.js", "UI/UXデザイン"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      twitter: "https://twitter.com/suzukihanako",
      github: "https://github.com/suzukihanako",
    },
  },
  {
    id: 3,
    name: "田中 健太",
    role: "技術リーダー",
    department: "理工学部 情報工学科",
    year: "4年",
    bio: "技術リーダーとして、勉強会のカリキュラム作成やメンバーの技術サポートを行っています。バックエンド開発とインフラが得意分野です。趣味は登山とギター演奏です。",
    skills: ["Java", "Spring Boot", "AWS", "Docker", "Kubernetes"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      github: "https://github.com/tanakakenta",
      linkedin: "https://linkedin.com/in/tanakakenta",
    },
  },
  {
    id: 4,
    name: "山田 美咲",
    role: "デザイナー",
    department: "教育学部 教育学科",
    year: "2年",
    bio: "サークルのデザイン全般を担当しています。ウェブデザインとUI/UXに興味があり、独学で勉強しています。趣味はイラスト制作と音楽鑑賞です。",
    skills: ["Figma", "Adobe XD", "Illustrator", "HTML/CSS"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      twitter: "https://twitter.com/yamadamisaki",
      website: "https://yamadamisaki.design",
    },
  },
  {
    id: 5,
    name: "伊藤 大輔",
    role: "会計",
    department: "経済学部 経済学科",
    year: "3年",
    bio: "サークルの会計を担当しています。データ分析とビジネスに興味があり、将来はデータサイエンティストを目指しています。趣味はサッカーと料理です。",
    skills: ["Python", "R", "SQL", "データ分析"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      github: "https://github.com/itodaisuke",
      linkedin: "https://linkedin.com/in/itodaisuke",
    },
  },
  {
    id: 6,
    name: "中村 優",
    role: "広報",
    department: "都市科学部 都市社会共生学科",
    year: "2年",
    bio: "広報担当として、SNSの運用やイベントの告知を行っています。マーケティングとコンテンツ制作に興味があります。趣味は映画鑑賞とカフェ巡りです。",
    skills: ["SNS運用", "コンテンツ制作", "HTML/CSS", "WordPress"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      twitter: "https://twitter.com/nakamurayuu",
      website: "https://nakamurayuu.com",
    },
  },
  {
    id: 7,
    name: "小林 拓也",
    role: "メンバー",
    department: "理工学部 数物・電子情報系学科",
    year: "1年",
    bio: "1年生ながらプログラミングの経験が豊富で、特にモバイルアプリ開発に興味があります。高校時代に独学でアプリを開発した経験があります。趣味はゲーム開発と読書です。",
    skills: ["Swift", "Kotlin", "Flutter", "Firebase"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      github: "https://github.com/kobayashitakuya",
      twitter: "https://twitter.com/kobayashitakuya",
    },
  },
  {
    id: 8,
    name: "加藤 さくら",
    role: "メンバー",
    department: "教育学部 学校教育課程",
    year: "1年",
    bio: "プログラミング初心者ですが、教育とテクノロジーの融合に興味があり入会しました。将来は教育現場でのICT活用を推進したいと考えています。趣味はピアノと絵本制作です。",
    skills: ["HTML/CSS", "Scratch", "教育工学"],
    image: "/placeholder.svg?height=400&width=400",
    social: {
      twitter: "https://twitter.com/katosakura",
    },
  },
]

export default function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6">メンバー紹介</h1>
            <p className="text-xl">
              Lumosを支える個性豊かなメンバーたち。 それぞれが異なる専門性と情熱を持ち、サークルに貢献しています。
            </p>
          </div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <Card
                key={member.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <div className="aspect-square relative">
                  <Image
                    src={member.image || "/placeholder.svg"}
                    alt={`${member.name}の写真`}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-xl font-bold">{member.name}</h3>
                  <p className="text-accent font-medium">{member.role}</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {member.department} {member.year}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedMember.name}</DialogTitle>
                <DialogDescription className="text-accent font-medium">
                  {selectedMember.role} | {selectedMember.department} {selectedMember.year}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mt-4">
                <div className="aspect-square relative rounded-lg overflow-hidden">
                  <Image
                    src={selectedMember.image || "/placeholder.svg"}
                    alt={`${selectedMember.name}の写真`}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-gray-700 mb-4">{selectedMember.bio}</p>
                  <div className="mb-4">
                    <h4 className="font-bold text-sm text-gray-500 mb-2">スキル</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMember.skills.map((skill, index) => (
                        <span key={index} className="bg-gray-100 text-primary text-xs px-2 py-1 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedMember.social && (
                    <div>
                      <h4 className="font-bold text-sm text-gray-500 mb-2">SNS / ウェブサイト</h4>
                      <div className="flex gap-3">
                        {selectedMember.social.github && (
                          <Link
                            href={selectedMember.social.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="GitHub"
                          >
                            <Github className="h-5 w-5" />
                          </Link>
                        )}
                        {selectedMember.social.twitter && (
                          <Link
                            href={selectedMember.social.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="Twitter"
                          >
                            <Twitter className="h-5 w-5" />
                          </Link>
                        )}
                        {selectedMember.social.linkedin && (
                          <Link
                            href={selectedMember.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5" />
                          </Link>
                        )}
                        {selectedMember.social.website && (
                          <Link
                            href={selectedMember.social.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-accent transition-colors"
                            aria-label="ウェブサイト"
                          >
                            <Globe className="h-5 w-5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
