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
      <p>2025年5月24日(土)に確定大新歓BBQを開催します</p>
      <br>
      <h3>イベント詳細</h3>
      <ul>
        <li>日時：2025年5月24日(土) 10:00-14:00</li>
        <li>場所：金沢自然公園BBQ広場</li>
        <li>持ち物：特になし（PCは不要です）</li>
        <li>参加費： 新入生 1500円 上級生 2000円</li>
        <li>参加方法：申し込みurlから申し込みください</li>
      </ul>

      <p><br>今年初の全体でのイベントです！ぜひご参加ください！</p>

      <p>ご質問等ございましたら、お問い合わせフォームよりご連絡ください。</p>
    `,
    image: "/placeholder.svg?height=600&width=1200",
    category: "イベント",
  },
  {
    id: 2,
    date: "2025年5月21-23日",
    title: "初学者向けプログラミング学習会",
    summary:"21-23日に3日連続の言語学習会をオンライン開催します。プログラミング初心者大歓迎です。",
    content: `
      <p>2025年5月21,22,23日にdiscord上でオンライン学習会を行います</p>
      <br>
      <h3>詳細</h3>
      <ul>
        <li>日時：2025年5月21,22,23日 21:00-22:00</li>
        <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;21日  C言語</li>
        <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;22日  JavaScript</li>
        <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;23日  Python</li>
        <li>場所：オンライン(discordのチャンネル)</li>
        <li>持ち物：PCでの参加をお願いします</li>
        <li>参加方法：申し込みurlから申し込みをお願いします</li>
        </ul>

      <p><br>初心者大歓迎のプロジェクトです！</p>
      <p>プログラミングに興味がある人はぜひご参加ください！</p>
      <p>ご質問等ございましたら、お問い合わせフォームよりご連絡ください。</p>

    `,
    image: "/placeholder.svg?height=600&width=1200",
    category: "実績",
  },
  {
    id: 3,
    date: "2025年4月中",
    title: "新入生歓迎イベント",
    summary:"4月中に新入生向けの複数のイベントを開催します。サークルに興味あるからはぜひご参加ください。",
    content: `
      <p>2025年4月中に複数の新入生向けイベントを行います</p>
      <p>Lumosに興味がある方だれでも大歓迎です！</p>
      <p>イベントの開催日時は下記のカレンダーをご覧ください</p>
      <!-- ここにカレンダー -->
      <p><br>申し込みは申し込みurlからお願いします。</p>
      <p>ご質問等ございましたら、お問い合わせフォームよりご連絡ください。</p>

    `,
    image: "/placeholder.svg?height=600&width=1200",
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
