import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Code, Users, Calendar, Award } from "lucide-react"

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-32 md:py-40 flex items-center justify-center hero-gradient text-white">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/60" />
        </div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl mx-auto leading-tight">
            Learning by Doing with Lumos
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
            横浜国立大学のプログラミングサークル。初心者からエキスパートまで、共に学び、成長する場を提供しています。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-primary">
              <Link href="/about">活動を見る</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/contact">お問い合わせへ</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section-padding bg-white">
        <div className="container mx-auto container-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Lumosについて</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Lumosは「光を灯す」という意味のラテン語。プログラミングの知識と経験を通じて、学生の未来に光を灯すことを目指しています。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Code className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">週1回の勉強会</h3>
                <p className="text-gray-600">
                  毎週水曜日に開催される勉強会では、プログラミングの基礎からウェブ開発、AI、データサイエンスまで幅広く学びます。
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Users className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">チーム開発</h3>
                <p className="text-gray-600">
                  実際のプロジェクトを通じて、チーム開発の経験を積むことができます。先輩からのフィードバックも受けられます。
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Calendar className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">ハッカソン参加</h3>
                <p className="text-gray-600">
                  学内外のハッカソンに積極的に参加し、実践的なスキルを磨きます。過去には複数の賞を受賞しています。
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/about">
                詳しく見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="section-padding bg-gray-50">
        <div className="container mx-auto container-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">最新のお知らせ</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Lumosの最新の活動やイベント情報をお届けします。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                id: 1,
                date: "2025年4月10日",
                title: "新入生歓迎会を開催します",
                summary:
                  "4月15日(水)18:00より、新入生歓迎会を開催します。プログラミングに興味のある方はぜひご参加ください。",
              },
              {
                id: 2,
                date: "2025年3月20日",
                title: "春のハッカソンで優勝しました",
                summary:
                  "横浜市主催の春のハッカソンにて、Lumosチームが優勝しました。開発したアプリは地域の課題解決に貢献します。",
              },
              {
                id: 3,
                date: "2025年3月5日",
                title: "2025年度の活動計画を発表",
                summary:
                  "2025年度の活動計画を発表しました。今年度はAIとウェブ開発に焦点を当てた勉強会を予定しています。",
              },
            ].map((news) => (
              <Card key={news.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="p-6">
                    <p className="text-sm text-gray-500 mb-2">{news.date}</p>
                    <h3 className="text-xl font-bold mb-2">{news.title}</h3>
                    <p className="text-gray-600 mb-4">{news.summary}</p>
                    <Link
                      href={`/news/${news.id}`}
                      className="text-accent hover:text-accent/80 font-medium inline-flex items-center"
                    >
                      詳細を見る
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/5">
              <Link href="/news">
                すべてのお知らせを見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding accent-gradient text-white">
        <div className="container mx-auto container-padding text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Lumosで一緒に学びませんか？</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            プログラミングの知識がなくても大丈夫。興味と熱意があれば、誰でも参加できます。
            一緒に学び、成長していきましょう。
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-primary">
            <Link href="/contact">お問い合わせる</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
