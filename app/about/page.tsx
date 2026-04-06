import { Card, CardContent } from "@/components/ui/card";
import {
  Code,
  Users,
  Calendar,
  Award,
  CheckCircle,
  Clock,
  MapPin,
} from "lucide-react";

export default function AboutPage() {
  return (
    <>
      {/* Header Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 bg-gradient-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-0"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="animate-fade-in-up text-3xl md:text-5xl font-bold mb-6">
              サークル紹介
            </h1>
            <p className="animate-fade-in-up-300 text-xl font-medium">
              Lumosは横浜国⽴⼤学の公認プログラミングサークルです。プログラミングに興味がある⼈が集まり、様々な活動を⾏っています。
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section 写真なし*/}
      <section className="section-padding bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-bold text-foreground">ミッション</h2>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-4">
                <CheckCircle className="mt-1 text-gradient-orange" />
                <p className="text-foreground">
                  <span className="font-semibold">学びの場の提供：</span>
                  プログラミング初心者から経験者まで、幅広いレベルのメンバーが学習しています。
                </p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="mt-1 text-gradient-orange" />
                <p className="text-foreground">
                  <span className="font-semibold">
                    プログラミングのスキル習得：
                  </span>
                  LT会や学習会を通じて、プログラミングのスキル向上を目指します。
                </p>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="mt-1 text-gradient-orange" />
                <p className="text-foreground">
                  <span className="font-semibold">コミュニティの形成：</span>
                  プログラミングに興味がある仲間と交流を深め、メンバー同士のなかをつくります。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* //写真付きバージョン
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">ミッション</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-bold">学びの場の提供：</span>
                    プログラミング初心者から経験者まで、幅広いレベルのメンバーが学習しています。
                  </p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-bold">プログラミングのスキル習得：</span>
                    LT会や学習会を通じて、プログラミングのスキル向上を目指します。
                  </p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-accent mr-3 mt-1 flex-shrink-0" />
                  <p className="text-gray-700">
                    <span className="font-bold">コミュニティの形成：</span>
                    プログラミングに興味がある仲間と交流を深め、メンバー同士のつながりをつくります。
                  </p>
                </div>
              </div>
            </div>


            <div className="relative h-[400px] rounded-lg overflow-hidden"> //写真
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
    */}

      {/* Activities Section */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-6 text-foreground">
              活動内容
            </h2>
            <p className="text-lg text-muted-foreground">
              Lumosでは以下の活動を通して、プログラミングの勉強、メンバーの交流を行っています。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2  gap-8">
            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Code className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  各種ハンズオン学習会
                </h3>
                <p className="text-muted-foreground mb-4">
                  初心者向けの言語学習会や第一歩を踏み出すための小規模なプロジェクトを開催しています。
                </p>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>不定期</span>
                </div>
                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>対面orオンライン（discord）</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Users className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  交流イベント
                </h3>
                <p className="text-muted-foreground mb-4">
                  ピザパーティーやBBQなどの対面イベントを開催し、メンバー同士の親睦を深めます。Lumosメンバーならだれでも参加することができます。
                </p>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>1-2ヶ月に1回 </span>
                </div>
                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>大学野音or空き教室</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Calendar className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">LT会</h3>
                <p className="text-muted-foreground mb-4">
                  毎週オンラインでのmini-LTに加え、対面で集合して行うLT会も開催しています。個人の成果を発表する場として、メンバーの成長を促します。
                </p>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>毎週月曜 / 不定期</span>
                </div>
                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>オンライン(discord) / 空き教室</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300 bg-card">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Award className="h-10 w-10 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  プロジェクト活動
                </h3>
                <p className="text-muted-foreground mb-4">
                  だれでも自由にプロジェクトを立ち上げることができ、メンバーと協力しながらプロジェクトを進めます。
                </p>
                <div className="flex items-center text-muted-foreground text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>不定期</span>
                </div>
                <div className="flex items-center text-muted-foreground text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>対面orオンライン（discord）</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      {/*
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
*/}

      {/* Join Us Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-6 text-foreground">
            Lumosに入ってみませんか？
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-muted-foreground">
            プログラミングができなくても大丈夫！
            <br />
            プログラミングに興味がある初心者から経験者まで誰でも大歓迎です。
          </p>
          {/*
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-primary">
            <Link href="/contact">お問い合わせ</Link>
          </Button>
          */}
        </div>
      </section>
    </>
  );
}
