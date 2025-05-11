import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Tag } from "lucide-react"
import { notFound } from "next/navigation"

// ニュース記事のデータ
const newsArticles = [
  {
    id: 1,
    date: "2025年4月10日",
    title: "新入生歓迎会を開催します",
    summary: "4月15日(水)18:00より、新入生歓迎会を開催します。プログラミングに興味のある方はぜひご参加ください。",
    content: `
      <p>横浜国立大学プログラミングサークルLumosでは、2025年4月15日(水)18:00より、新入生歓迎会を開催します。</p>
      
      <h3>イベント詳細</h3>
      <ul>
        <li>日時：2025年4月15日(水) 18:00-20:00</li>
        <li>場所：情報基盤センター 3階セミナールーム</li>
        <li>内容：サークル紹介、先輩との交流、簡単なプログラミング体験</li>
        <li>対象：プログラミングに興味のある横浜国立大学の学生（学部・学科不問、初心者歓迎）</li>
        <li>持ち物：特になし（PCは不要です）</li>
      </ul>
      
      <p>プログラミングの経験がなくても大丈夫です。興味のある方はぜひお気軽にご参加ください。</p>
      
      <h3>参加方法</h3>
      <p>事前申し込みは不要です。当日、直接会場にお越しください。</p>
      
      <p>ご質問等ございましたら、お問い合わせフォームよりご連絡ください。</p>
    `,
    image: "/placeholder.svg?height=600&width=1200",
    category: "イベント",
  },
  {
    id: 2,
    date: "2025年3月20日",
    title: "春のハッカソンで優勝しました",
    summary: "横浜市主催の春のハッカソンにて、Lumosチームが優勝しました。開発したアプリは地域の課題解決に貢献します。",
    content: `
      <p>2025年3月15日〜16日に開催された横浜市主催の「春のハッカソン2025」にて、Lumosチームが最優秀賞を受賞しました。</p>
      
      <h3>ハッカソン概要</h3>
      <p>今回のハッカソンのテーマは「地域の課題をテクノロジーで解決する」でした。全国から20チームが参加し、48時間という限られた時間の中でアイデアを形にするという挑戦に取り組みました。</p>
      
      <h3>開発したアプリ「おつかいさん」について</h3>
      <p>Lumosチームは、高齢者の買い物を支援するマッチングアプリ「おつかいさん」を開発しました。このアプリは、買い物に行くことが困難な高齢者と、買い物のついでに手伝いたいと考える地域住民をマッチングするプラットフォームです。</p>
      
      <p>主な機能：</p>
      <ul>
        <li>高齢者は簡単な操作で買い物リストを登録できる</li>
        <li>買い物を手伝いたい人は、近くの依頼をマップで確認できる</li>
        <li>安全のため、利用者は身分証明書による本人確認を行う</li>
        <li>配達完了後、相互評価システムで信頼性を担保</li>
      </ul>
      
      <h3>審査員からの評価</h3>
      <p>審査員からは「社会課題に対する深い理解と、それを解決するための技術的アプローチが素晴らしい」「UIがシンプルで高齢者にも使いやすく設計されている」といった高評価をいただきました。</p>
      
      <h3>今後の展開</h3>
      <p>今回開発したアプリは、横浜市の協力を得て、実際にサービスとして展開することを目指しています。現在、横浜市の担当部署と連携し、実証実験の準備を進めています。</p>
      
      <p>Lumosでは、このようなプロジェクトに興味のある学生を随時募集しています。プログラミングの経験がなくても、アイデアや熱意のある方はぜひお問い合わせください。</p>
    `,
    image: "/placeholder.svg?height=600&width=1200",
    category: "実績",
  },
  {
    id: 3,
    date: "2025年3月5日",
    title: "2025年度の活動計画を発表",
    summary: "2025年度の活動計画を発表しました。今年度はAIとウェブ開発に焦点を当てた勉強会を予定しています。",
    content: `
      <p>Lumosでは、2025年度の活動計画を発表しました。今年度は特にAIとウェブ開発に焦点を当てた勉強会を予定しています。</p>
      
      <h3>2025年度の活動テーマ</h3>
      <p>「AI時代のウェブ開発 - 創造性と技術の融合」をテーマに、以下の活動を計画しています。</p>
      
      <h3>定期勉強会（毎週水曜日 18:00-20:00）</h3>
      <p>前期（4月〜7月）のカリキュラム：</p>
      <ul>
        <li>ウェブ開発の基礎（HTML, CSS, JavaScript）</li>
        <li>モダンフレームワーク入門（React, Next.js）</li>
        <li>AI基礎（機械学習の概念、Python入門）</li>
        <li>AIモデルの活用（OpenAI API, Hugging Face等）</li>
      </ul>
      
      <p>後期（10月〜1月）のカリキュラム：</p>
      <ul>
        <li>バックエンド開発（Node.js, Express, データベース）</li>
        <li>AIを活用したウェブアプリケーション開発</li>
        <li>モバイルアプリ開発入門（React Native）</li>
        <li>クラウドサービスの活用（AWS, Vercel等）</li>
      </ul>
      
      <h3>プロジェクト活動</h3>
      <p>今年度は以下の3つのプロジェクトチームを立ち上げる予定です：</p>
      <ul>
        <li>大学生活支援アプリ開発チーム</li>
        <li>AI学習アシスタント開発チーム</li>
        <li>地域連携プロジェクトチーム</li>
      </ul>
      
      <h3>イベント予定</h3>
      <ul>
        <li>4月：新入生歓迎会</li>
        <li>6月：企業エンジニア講演会</li>
        <li>8月：夏合宿（箱根予定）</li>
        <li>10月：常盤祭出展</li>
        <li>12月：冬のハッカソン</li>
        <li>2月：成果発表会</li>
      </ul>
      
      <p>各イベントの詳細は、決まり次第お知らせします。Lumosの活動に興味のある方は、ぜひお問い合わせください。</p>
    `,
    image: "/placeholder.svg?height=600&width=1200",
    category: "お知らせ",
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
