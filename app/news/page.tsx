import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

// ニュース記事のデータ
const newsArticles = [
  {
    id: 1,
    date: "2025年4月10日",
    title: "新入生歓迎会を開催します",
    summary: "4月15日(水)18:00より、新入生歓迎会を開催します。プログラミングに興味のある方はぜひご参加ください。",
    image: "/placeholder.svg?height=400&width=600",
    category: "イベント",
  },
  {
    id: 2,
    date: "2025年3月20日",
    title: "春のハッカソンで優勝しました",
    summary: "横浜市主催の春のハッカソンにて、Lumosチームが優勝しました。開発したアプリは地域の課題解決に貢献します。",
    image: "/placeholder.svg?height=400&width=600",
    category: "実績",
  },
  {
    id: 3,
    date: "2025年3月5日",
    title: "2025年度の活動計画を発表",
    summary: "2025年度の活動計画を発表しました。今年度はAIとウェブ開発に焦点を当てた勉強会を予定しています。",
    image: "/placeholder.svg?height=400&width=600",
    category: "お知らせ",
  },
  {
    id: 4,
    date: "2025年2月15日",
    title: "企業との共同プロジェクトを開始",
    summary:
      "地元IT企業と共同で、学生向けキャリア支援アプリの開発プロジェクトを開始しました。実践的な開発経験を積む絶好の機会です。",
    image: "/placeholder.svg?height=400&width=600",
    category: "プロジェクト",
  },
  {
    id: 5,
    date: "2025年1月25日",
    title: "冬季プログラミング講習会を実施",
    summary:
      "冬休み期間中、プログラミング初心者向けの講習会を実施しました。30名以上の学生が参加し、基礎からウェブアプリ開発までを学びました。",
    image: "/placeholder.svg?height=400&width=600",
    category: "イベント",
  },
  {
    id: 6,
    date: "2024年12月10日",
    title: "OB・OG交流会を開催",
    summary:
      "IT業界で活躍するOB・OGを招いた交流会を開催しました。就職活動のアドバイスや業界の最新動向について貴重な話を聞くことができました。",
    image: "/placeholder.svg?height=400&width=600",
    category: "イベント",
  },
  {
    id: 7,
    date: "2024年11月20日",
    title: "技術書籍を寄贈いただきました",
    summary:
      "出版社様より、プログラミングに関する技術書籍を10冊寄贈いただきました。サークル内で貸し出しを行いますので、興味のある方はご連絡ください。",
    image: "/placeholder.svg?height=400&width=600",
    category: "お知らせ",
  },
  {
    id: 8,
    date: "2024年10月5日",
    title: "大学祭でプログラミング体験ブースを出展",
    summary:
      "常盤祭にてプログラミング体験ブースを出展しました。多くの方に参加いただき、プログラミングの楽しさを体験していただきました。",
    image: "/placeholder.svg?height=400&width=600",
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
              Lumosの最新の活動やイベント情報をお届けします。 サークルの活動内容や実績について詳しく知ることができます。
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
