import Link from "next/link"
import Image from "next/image"
import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {ArrowRight, ArrowLeft, Calendar, Tag} from "lucide-react"
import {newsService} from '@/lib/content'
import {NewsItem, NewsItemData} from '@/types/content'

export default async function NewsPage() {
  let newsItems: NewsItemData[] = [
    {
      id: "4",
      date: "2025年10月31日",
      title: "クレープ屋 Crepe++",
      summary: "常盤祭にてクレープ屋を出店します。",
      content: `
    <p>2025年10月31日から11月2日にかけて開催される常盤祭にて、Lumosは「Crepe++」というクレープ屋を出店します！</p>
    <p>メンバー自ら調理し、さまざまな味のクレープを販売予定です。</p>
    <p>文化祭の雰囲気を楽しみながら、ぜひお立ち寄りください！</p>
  `,
      image: "/assets/Crepe.png",
      category: "イベント",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
    {
      id: "5",
      date: "2025年10月23日",
      title: "ピザパーティー",
      summary: "サークルメンバーでピザパーティーを開催しました！",
      content: `
    <p>2025年10月23日に、秋学期最初のイベントとしてピザパーティーを開催しました。</p>
    <p>約3か月ぶりの対面活動ということもあり、多くのメンバーが参加し、交流を深めました。</p>
    <p>楽しく充実した時間となりました。</p>
  `,
      image: "/assets/pizza.png",
      category: "イベント",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
    {
      id: "6",
      date: "2025年7月10日",
      title: "LT会",
      summary: "個人の成果を発表するLT会を開催しました。",
      content: `
    <p>2025年7月10日に、サークル内でLT（Lightning Talk）会を開催しました。</p>
    <p>参加者がそれぞれ10分程度の発表を行い、それぞれの成果を共有しました。</p>
    <p>互いに刺激を受ける良い機会となりました</p>`,
      image: "/assets/LT_1.png",
      category: "プロジェクト",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
    {
      id: "7",
      date: "2025年6月17日",
      title: "ドーナツパーティー",
      summary: "サークルメンバーでミスドのドーナツを食べました。",
      content: `
    <p>2025年6月17日に、Lumosメンバーでドーナツパーティーを開催しました！</p>
    <p>ミスタードーナツのドーナツをみんなで食べ、和やかな雰囲気で交流しました。</p>
  `,
      image: "/assets/donut.png",
      category: "イベント",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
    {
      id: "1",
      date: "2025年5月24日",
      title: "確定大新歓BBQ",
      summary: "5月24日に確定大新歓としてBBQを行います。BBQを通じて親睦を深めましょう。",
      content: `
      <p>2025年5月24日(土)に確定大新歓BBQを開催しました。</p>
      <p>当日は天気にも恵まれ、約25名の新入生・在学生が参加して、和やかで楽しい時間を過ごしました。</p>

      <p>プログラミングの話から大学生活のことまで、新入生同士の交流も深まりました！</p>

      <p>今後もLumosでは、学びと交流の場をどんどん企画していきます。</p>

    `,
      image: "/assets/BBQ.jpg",
      category: "イベント",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
    {
      id: "2",
      date: "2025年5月21-23日",
      title: "初学者向けプログラミング学習会",
      summary: "21-23日に3日連続の言語学習会をオンライン開催しました。",
      content: `
      <p>2025年5月21,22,23日にdiscord上でオンライン学習会を行いました</p>
      <p>21日にC言語, 22日にJavaScript, 23日にPythonの学習会を行いました。</p>
      <p>それぞれ約5-7名ほどのプログラミング初心者が参加し、実際にコードを書きながら学習を進めました。</p>

      <p>今後もLumosでは学習の場を企画していく予定です。</p>
    `,
      image: "/assets/C-program.png",
      category: "プロジェクト",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
    {
      id: "3",
      date: "2025年4月中",
      title: "新入生歓迎イベント",
      summary: "4月中に新入生向けの複数のイベントを開催しました。",
      content: `
      <p>2025年4月中に複数の新入生向けイベントを行いました。</p>
      <p>イベント内容はみさきマグロツアーやピザ会、女子会や鎌倉散策などを行いました。</p>
      <p>Lumosに興味がある新入生が多くのイベントに参加してくれました。</p>

    `,
      image: "/assets/shinkan.jpg",
      category: "イベント",
      createdAt: new Date(),
      updatedAt: new Date(),
      published: true,
    },
  ];
  let error: string | null = null;

  try {
    newsItems = await newsService.getAll({publishedOnly: true});
  } catch (err) {
    console.error('Error fetching news:', err);
    error = 'ニュースの取得に失敗しました。';
  }

  const formatDate = (date: string) => {
    if (!date) return '';
    return date

    // let dateObj = date;
    // if (typeof date.toDate === 'function') {
    //   dateObj = date.toDate();
    // }
    //
    // return dateObj.toLocaleDateString('ja-JP', {
    //   year: 'numeric',
    //   month: 'long',
    //   day: 'numeric',
    // });
  };

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
          {/* Error Message */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {newsItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">まだお知らせはありません。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {newsItems.map((article) => (
                <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  {article.image && (
                    <div className="aspect-video relative bg-gray-100">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover"
                        unoptimized={article.image.startsWith('/')}
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="mr-1 h-3 w-3"/>
                        {formatDate(article.date)}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{article.title}</h3>
                    <p className="text-gray-600 mb-4">{article.summary}</p>

                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {article.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            <Tag className="mr-1 h-2 w-2"/>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link
                      href={article.slug ? `/news/${article.slug}` : `/news/${article.id}`}
                      className="text-accent hover:text-accent/80 font-medium inline-flex items-center"
                    >
                      詳細を見る
                      <ArrowRight className="ml-1 h-4 w-4"/>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export const metadata = {
  title: 'お知らせ | Lumos',
  description: '横浜国立大学プログラミングサークルLumosのお知らせページです。最新の活動やイベント情報をご覧ください。',
};
