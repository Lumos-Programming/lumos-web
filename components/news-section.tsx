'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {ArrowRight} from 'lucide-react';
import {newsService} from '@/lib/content';
import {NewsItem, NewsItemData} from '@/types/content';

export function NewsSection() {
  const [news, setNews] = useState<NewsItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const newsData = await newsService.getAll({
          limit: 3,
          publishedOnly: true
        });
        setNews(newsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('ニュースの取得に失敗しました。');

        // Fallback to sample data (no images until uploaded to Firebase Storage)
        setNews(
          [
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
            },
            {
              id: "6",
              date: "2025年7月10日",
              title: "LT会",
              summary: "個人の成果を発表するLT会を開催しました。",
              content: `
    <p>2025年7月10日に、サークル内でLT（Lightning Talk）会を開催しました。</p>
    <p>参加者がそれぞれ10分程度の発表を行い、それぞれの成果を共有しました。</p>
    <p>互いに刺激を受ける良い機会となりました</p>
  `,
              image: "/assets/LT_1.png",
              category: "プロジェクト",
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
            },
          ] as NewsItemData[]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (date: Date | any) => {
    if (!date) return '';

    let dateObj = date;
    if (typeof date.toDate === 'function') {
      dateObj = date.toDate();
    }

    return dateObj.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <section className="section-padding bg-gray-50">
        <div className="container mx-auto container-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">お知らせ</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Lumosの最新の活動やイベント情報をお知らせします。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
                      <div className="h-6 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-gray-50">
      <div className="container mx-auto container-padding">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">お知らせ</h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Lumosの最新の活動やイベント情報をお知らせします。
          </p>
          {error && (
            <p className="text-sm text-orange-600 mt-2">
              {error} デフォルトのお知らせを表示しています。
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map((newsItem) => (
            <Card key={newsItem.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {newsItem.image && (
                  <div className="aspect-video bg-gray-100">
                    <img
                      src={newsItem.image}
                      alt={newsItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <p className="text-sm text-gray-500 mb-2">
                    {formatDate(newsItem.date)}
                  </p>
                  <h3 className="text-xl font-bold mb-2">{newsItem.title}</h3>
                  <p className="text-gray-600 mb-4">{newsItem.summary}</p>
                  <Link
                    href={newsItem.slug ? `/news/${newsItem.slug}` : `/news/${newsItem.id}`}
                    className="text-accent hover:text-accent/80 font-medium inline-flex items-center"
                  >
                    詳細を見る
                    <ArrowRight className="ml-1 h-4 w-4"/>
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
              <ArrowRight className="ml-2 h-4 w-4"/>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
