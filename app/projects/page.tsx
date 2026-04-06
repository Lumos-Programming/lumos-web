"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

// 現在のプロジェクト
const currentProjects = [
  {
    id: 1,
    title: "Unityでゲーム開発",
    description:
      "プロジェクトの説明を入力してください。現在取り組んでいる内容や目標を記述します。",
    image: "/assets/lumoslogo.png",
    status: "進行中",
    technologies: ["Unity", "C#", "Blender"],
    leaderId: 5,
    leaderName: "ぶりけのあっちょん",
  },
  {
    id: 2,
    title: "機械学習プロジェクト",
    description:
      "「何ができるのか」から「何を創り出すか」へ ― 機械学習をアクティブに体感し、新たな価値を生み出そう！",
    image:
      "https://storage.googleapis.com/lumos-web-profile-data/20260405_MLProject_TN_v1.jpg",
    status: "計画中",
    technologies: ["Python", "PyTorch"],
    leaderId: 3,
    leaderName: "坪井 一馬",
  },
  {
    id: 3,
    title: "TryHackMeプロジェクト",
    description:
      "TryHackMeというセキュリティ学習サイトの利用を中心に、セキュリティ関連の話題でワイワイする会です。",
    image:
      "https://storage.googleapis.com/lumos-web-profile-data/tryhackmeproject.jpg",
    status: "計画中",
    technologies: ["Kali Linux", "Burp Suite", "Metasploit"],
    leaderId: 2,
    leaderName: "Shion",
  },
];

// 過去のプロジェクト（アーカイブ）
const archivedProjects = [
  {
    id: 101,
    title: "初めてのプロダクト開発ゼミ",
    description:
      "生成AIをフル活用してとにかく初めてモノづくりをします。初心者あつまれ！！",
    image: "https://storage.googleapis.com/lumos-web-profile-data/hajipro.jpg",
    completedDate: "2025年12月",
    technologies: ["Next.js", "v0"],
    leaderId: 1,
    leaderName: "しゅん",
  },
  {
    id: 102,
    title: "応用情報プロジェクト",
    description: "4月のIPA試験に向けた勉強と情報共有のための会。",
    image: "/assets/lumoslogo.png",
    completedDate: "2025年1月",
    technologies: [],
    leaderId: 1,
    leaderName: "しゅん",
  },
];

export default function ProjectsPage() {
  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">
              プロジェクト
            </h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosメンバーが取り組むプロジェクトを紹介します
            </p>
          </div>
        </div>
      </section>

      {/* Current Projects Section */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              現在のプロジェクト
            </h2>
            <p className="text-lg text-muted-foreground">
              現在Lumosメンバーが進めているプロジェクト一覧です
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentProjects.map((project) => (
              <Card
                key={project.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card flex flex-col"
              >
                <div className="aspect-video relative">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="mb-4">
                    <span className="inline-block bg-gradient-orange text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {project.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {project.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 flex-grow">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech, index) => (
                      <span
                        key={index}
                        className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/members#member-${project.leaderId}`}
                    className="inline-block text-accent-foreground hover:text-accent-foreground/80 font-medium transition-colors"
                  >
                    👤 {project.leaderName}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Archived Projects Section */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              アーカイブ
            </h2>
            <p className="text-lg text-muted-foreground">
              過去に完了したプロジェクト
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {archivedProjects.map((project) => (
              <Card
                key={project.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="aspect-square md:aspect-auto md:w-48 relative flex-shrink-0">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-6 flex flex-col flex-grow">
                    <p className="text-sm text-muted-foreground mb-2">
                      {project.completedDate}完了
                    </p>
                    <h3 className="text-xl font-bold mb-2 text-foreground">
                      {project.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 flex-grow">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies.map((tech, index) => (
                        <span
                          key={index}
                          className="bg-background text-foreground text-xs px-2 py-1 rounded border border-border"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/members#member-${project.leaderId}`}
                      className="inline-block text-accent-foreground hover:text-accent-foreground/80 font-medium transition-colors"
                    >
                      👤 {project.leaderName}
                    </Link>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-foreground">
            プロジェクトに参加しませんか？
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-muted-foreground">
            自分のスキルを活かしたり、新しいことに挑戦したり、
            <br />
            Lumosではメンバーが主体的にプロジェクトを進めています。
          </p>
        </div>
      </section>
    </>
  );
}
