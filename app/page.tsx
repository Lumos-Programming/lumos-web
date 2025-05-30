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
            Lumos : Where Programmer Connect and Grow.
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
            初心者から経験者まで、すべてのプログラマーが気軽に集まり、学び合えるオンラインコミュニティを提供します。
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
              プログラミングに興味がある人が集まり、勉強や交流活動を行っています。<br />
              discordを用いたオンライン活動が中心となっています。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Code className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">短期間学習会</h3>
                <p className="text-gray-600">
                  初⼼者向けの⾔語学習会や⼩規模なプロジェクトなど数回で終わる学習会を行います。
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Users className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">交流イベント</h3>
                <p className="text-gray-600">
                  ピザパーティーやBBQなどの対面イベントを開催し、メンバー同士の親睦を深めます。
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Calendar className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">LT会</h3>
                <p className="text-gray-600">
                  横浜国立大学の学園祭(常盤祭)にて、グループもしくは個人で発表会を行います。
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Calendar className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">プロジェクト立ち上げ</h3>
                <p className="text-gray-600">
                  だれでも自由にプロジェクトを立ち上げることができ、メンバーと協力しながらプロジェクトを進めます。
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
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Lumosの最新の活動やイベント情報をお知らせします。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                id: 1,
                date: "2025年5月24日",
                title: "確定大新歓BBQ",
                summary:
                  "5月24日に確定大新歓としてBBQを行います。BBQを通じて親睦を深めましょう。",
              },
              {
                id: 2,
                date: "2025年5月21-23日",
                title: "初学者向けプログラミング学習会",
                summary:
                  "21-23日に3日連続の言語学習会をオンライン開催します。プログラミング初心者大歓迎です。",
              },
              {
                id: 3,
                date: "2025年4月中",
                title: "新入生歓迎イベント",
                summary:
                  "4月中に新入生向けの複数のイベントを開催します。サークルに興味あるからはぜひご参加ください。",
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
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Lumosに入ってみませんか？</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            プログラミングができなくても大丈夫！<br />
            プログラミングに興味がある初心者から経験者まで誰でも大歓迎です。
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-primary">
            <Link href="/contact">お問い合わせる</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
