import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

// ニュース記事のデータ
const newsArticles = [
  {
    id: 1,
    date: "2025年5月24日",
    title: "確定大新歓BBQ",
    summary:"5月24日に確定大新歓としてBBQを行いました。",
    image: "aset/BBQ.jpg?height=400&width=600",
    category: "イベント",
  },
  {
    id: 2,
    date: "2025年5月21-23日",
    title: "初学者向けプログラミング学習会",
    summary:"21-23日に3日連続の言語学習会をオンライン開催しました。",
    image: "aset/C-program.png?height=400&width=600",
    category: "プロジェクト",
  },
  {
    id: 3,
    date: "2025年4月中",
    title: "新入生歓迎イベント",
    summary:"4月中に新入生向けの複数のイベントを開催しました。",
    image: "aset/SHINKAN1.jpg?height=400&width=600",
    category: "イベント",
  },


]

export default function NewsPage() {
  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6">お知らせ</h1>
            <p className="text-xl">
              Lumosの活動やイベント情報についてお知らせします。
            </p>
          </div>
        </div>
      </section>

      {/* News Articles */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsArticles.map((article) => (
              <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video relative">
                  <Image src={article.image || "/placeholder.svg"} alt={article.title} fill className="object-cover" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-accent text-primary text-xs font-medium px-2 py-1 rounded-full">
                      {article.category}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500 mb-2">{article.date}</p>
                  <h3 className="text-xl font-bold mb-2">{article.title}</h3>
                  <p className="text-gray-600 mb-4">{article.summary}</p>
                  <Link
                    href={`/news/${article.id}`}
                    className="text-accent hover:text-accent/80 font-medium inline-flex items-center"
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
