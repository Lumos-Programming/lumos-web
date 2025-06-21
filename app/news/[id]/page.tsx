import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Tag } from "lucide-react"
import { notFound } from "next/navigation"

// ニュース記事のデータ
const newsArticles = [
  {
    id: 1,
    date: "2025年5月24日",
    title: "確定大新歓BBQ",
    summary:"5月24日に確定大新歓としてBBQを行います。BBQを通じて親睦を深めましょう。",
    content: `
      <p>2025年5月24日(土)に確定大新歓BBQを開催しました。</p>
      <p>当日は天気にも恵まれ、約25名の新入生・在学生が参加して、和やかで楽しい時間を過ごしました。</p>

      <p>プログラミングの話から大学生活のことまで、新入生同士の交流も深まりました！</p>

      <p>今後もLumosでは、学びと交流の場をどんどん企画していきます。</p>

    `,
    image: "/aset/BBQ.jpg?height=600&width=1200",
    category: "イベント",
  },
  {
    id: 2,
    date: "2025年5月21-23日",
    title: "初学者向けプログラミング学習会",
    summary:"21-23日に3日連続の言語学習会をオンライン開催しました。",
    content: `
      <p>2025年5月21,22,23日にdiscord上でオンライン学習会を行いました</p>
      <p>21日にC言語, 22日にJavaScript, 23日にPythonの学習会を行いました。</p>
      <p>それぞれ約5-7名ほどのプログラミング初心者が参加し、実際にコードを書きながら学習を進めました。</p>

      <p>今後もLumosでは学習の場を企画していく予定です。</p>
    `,
    image: "/aset/C-program.png?height=600&width=1200",
    category: "プロジェクト",
  },
  {
    id: 3,
    date: "2025年4月中",
    title: "新入生歓迎イベント",
    summary:"4月中に新入生向けの複数のイベントを開催しました。",
    content: `
      <p>2025年4月中に複数の新入生向けイベントを行いました。</p>
      <p>イベント内容はみさきマグロツアーやピザ会、女子会や鎌倉散策などを行いました。</p>
      <p>Lumosに興味がある新入生が多くのイベントに参加してくれました。</p>

    `,
    image: "/aset/SHINKAN1.jpg?height=400&width=1000",
    category: "イベント",
  },
]

export default function NewsDetailPage({ params }: { params: { id: string } }) {
  const articleId = Number.parseInt(params.id)
  const article = newsArticles.find((article) => article.id === articleId)

  if (!article) {
    notFound()
  }

  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <Link href="/news" className="inline-flex items-center text-white/80 hover:text-white mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              お知らせ一覧に戻る
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                {article.date}
              </div>
              <div className="flex items-center">
                <Tag className="mr-2 h-4 w-4" />
                <span className="bg-accent/20 text-white px-2 py-0.5 rounded-full">{article.category}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 rounded-lg overflow-hidden">
              <Image
                src={article.image || "/placeholder.svg"}
                alt={article.title}
                width={1200}
                height={600}
                className="w-full h-auto"
              />
            </div>

            <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />

            <div className="mt-12 pt-8 border-t">
              <Button asChild variant="outline">
                <Link href="/news">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  お知らせ一覧に戻る
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
