import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Code, Users, Calendar, Award, CheckCircle, Clock, MapPin } from "lucide-react"

export default function AboutPage() {
  return (
    <>
      {/* Header Section */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6">サークル紹介</h1>
            <p className="text-xl">
              初心者から経験者まで、すべてのプログラマーが気軽に集まり、学び合えるオンラインコミュニティを提供します。
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">ミッション</h2>
              <p className="text-lg text-gray-700 mb-6">
                Lumosは「光を灯す」という意味のラテン語です。私たちは、プログラミングの知識と経験を通じて、
                学生の未来に光を灯すことを目指しています。
              </p>
              <p className="text-lg text-gray-700 mb-6">
                テクノロジーの力で社会に貢献できる人材を育成し、学生同士が互いに学び合い、
                成長できるコミュニティを作ることが私たちの使命です。
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-bold">学びの場の提供：</span>
                    プログラミング初心者から経験者まで、それぞれのレベルに合わせた学習環境を提供します。
                  </p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-bold">実践的なスキル習得：</span>
                    実際のプロジェクトやハッカソンを通じて、実践的なスキルを身につけます。
                  </p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-bold">コミュニティの形成：</span>
                    同じ興味を持つ仲間との交流を通じて、生涯の友人や協力者を見つけます。
                  </p>
                </div>
              </div>
            </div>
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <Image
                src="/placeholder.svg?height=800&width=600"
                alt="Lumosのミーティングの様子"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">活動内容</h2>
            <p className="text-lg text-gray-700">
              Lumosでは、以下のような活動を通じてプログラミングスキルを磨いています。
              初心者から経験者まで、それぞれのレベルに合わせた活動に参加できます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Code className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">定期勉強会</h3>
                <p className="text-gray-600 mb-4">
                  毎週水曜日18:00から20:00まで、プログラミングの基礎からウェブ開発、AI、データサイエンスまで幅広いテーマで勉強会を開催しています。
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>毎週水曜日 18:00-20:00</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>情報基盤センター 3階セミナールーム</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Users className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">チーム開発プロジェクト</h3>
                <p className="text-gray-600 mb-4">
                  学期ごとにチームを組み、実際のウェブアプリやモバイルアプリを開発します。企画から設計、実装、テスト、リリースまでの一連の流れを経験できます。
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>月2回 土曜日 13:00-17:00</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>中央図書館 グループ学習室</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Calendar className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">ハッカソン参加</h3>
                <p className="text-gray-600 mb-4">
                  学内外のハッカソンに積極的に参加し、実践的なスキルを磨きます。過去には横浜市主催のハッカソンで優勝するなど、複数の賞を受賞しています。
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>年3〜4回</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>開催地による</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Award className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">OB・OG交流会</h3>
                <p className="text-gray-600 mb-4">
                  IT企業で働くOB・OGを招いた交流会を開催し、業界の最新動向や就職活動のアドバイスを得る機会を提供しています。
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>年2回（夏・冬）</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>大学会館 多目的ホール</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Code className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">技術書読書会</h3>
                <p className="text-gray-600 mb-4">
                  月に一度、プログラミングや技術に関する書籍を選び、読書会を開催しています。知識を深めるとともに、ディスカッションを通じて理解を深めます。
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>月1回 日曜日 14:00-16:00</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>中央図書館 セミナールーム</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-accent transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Users className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-2">合宿・交流イベント</h3>
                <p className="text-gray-600 mb-4">
                  夏休みには合宿を開催し、集中的にプログラミングを学ぶとともに、メンバー同士の親睦を深めます。また、他大学のプログラミングサークルとの交流イベントも開催しています。
                </p>
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>年1回（夏）</span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>箱根・伊豆方面</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">実績</h2>
            <p className="text-lg text-gray-700">
              Lumosのメンバーは、様々なコンテストやハッカソンで成果を上げています。
              これらの経験を通じて、実践的なスキルを磨いています。
            </p>
          </div>

          <div className="space-y-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">2024年12月</p>
                    <h3 className="text-xl font-bold">横浜市主催 地域課題解決ハッカソン 優勝</h3>
                    <p className="text-gray-700 mt-2">
                      地域の高齢者向け買い物支援アプリ「おつかいさん」を開発し、最優秀賞を受賞しました。
                    </p>
                  </div>
                  <Image
                    src="/placeholder.svg?height=150&width=150"
                    alt="横浜市ハッカソン優勝トロフィー"
                    width={150}
                    height={150}
                    className="rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">2024年8月</p>
                    <h3 className="text-xl font-bold">全国学生プログラミングコンテスト 準優勝</h3>
                    <p className="text-gray-700 mt-2">
                      AIを活用した学習支援システム「StudyBuddy」を開発し、準優勝しました。
                    </p>
                  </div>
                  <Image
                    src="/placeholder.svg?height=150&width=150"
                    alt="プログラミングコンテスト準優勝メダル"
                    width={150}
                    height={150}
                    className="rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">2024年5月</p>
                    <h3 className="text-xl font-bold">大学祭アプリコンテスト 最優秀賞</h3>
                    <p className="text-gray-700 mt-2">
                      横浜国立大学の大学祭「常盤祭」の公式アプリを開発し、最優秀賞を受賞しました。
                    </p>
                  </div>
                  <Image
                    src="/placeholder.svg?height=150&width=150"
                    alt="大学祭アプリコンテスト最優秀賞"
                    width={150}
                    height={150}
                    className="rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Join Us Section */}
      <section className="py-16 md:py-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Lumosに参加しませんか？</h2>
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
