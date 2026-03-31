import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

// ニュース記事のデータ
const newsArticles = [
  {
    id: 8,
    date: "2026年3月2日",
    title: "毎週mini-LT開始",
    summary: "毎週オンラインでのプログラミング成果共有会mini-LTが発足しました。",
    image: "/assets/mini-lt.png",
    category: "プロジェクト",
  },
  {
    id: 4,
    date: "2025年10月31日",
    title: "クレープ屋 Crepe++",
    summary: "常盤祭にてクレープ屋を出店しました。",
    image: "/assets/Crepe.png",
    category: "イベント",
  },
  {
    id: 5,
    date: "2025年10月23日",
    title: "ピザパーティー",
    summary: "サークルメンバーでピザパーティーを開催しました。",
    image: "/assets/pizza.png",
    category: "イベント",
  },
  {
    id: 6,
    date: "2025年7月10日",
    title: "LT会",
    summary: "個人の成果を発表するLT会を開催しました。",
    image: "/assets/LT_1.png",
    category: "プロジェクト",
  },
  {
    id: 7,
    date: "2025年6月17日",
    title: "ドーナツパーティー",
    summary: "サークルメンバーでミスドのドーナツを食べました。",
    image: "/assets/donut.png",
    category: "イベント",
  },

  {
    id: 1,
    date: "2025年5月24日",
    title: "確定大新歓BBQ",
    summary: "5月24日に確定大新歓としてBBQを行いました。",
    image: "/assets/BBQ.jpg",
    category: "イベント",
  },
  {
    id: 2,
    date: "2025年5月21-23日",
    title: "初学者向けプログラミング学習会",
    summary: "21-23日に3日連続の言語学習会をオンライン開催しました。",
    image: "/assets/C-program.png",
    category: "プロジェクト",
  },
  {
    id: 3,
    date: "2025年4月中",
    title: "新入生歓迎イベント",
    summary: "4月中に新入生向けの複数のイベントを開催しました。",
    image: "/assets/shinkan.jpg",
    category: "イベント",
  },


]

export default function NewsPage() {
  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">お知らせ</h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosの活動やイベント情報についてお知らせします。
            </p>
          </div>
        </div>
      </section>

      {/* News Articles */}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsArticles.map((article) => (
              <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card">
                <div className="aspect-video relative">
                  <Image src={article.image || "/placeholder.svg"} alt={article.title} fill className="object-cover" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-gradient-orange text-white text-xs font-medium px-2 py-1 rounded-full">
                      {article.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm font-semibold text-gradient-orange mb-2">{article.date}</p>
                  <h3 className="text-xl font-bold mb-2 text-foreground">{article.title}</h3>
                  <p className="text-muted-foreground mb-4">{article.summary}</p>
                  <Link
                    href={`/news/${article.id}`}
                    className="text-accent-foreground hover:text-accent-foreground/80 font-medium inline-flex items-center transition-colors"
                  >
                    詳細を見る
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
