"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Code,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { newsArticles } from "./news/news-data";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

// 日本語の日付文字列をYYYYMMDD形式の数値に変換してソート
const parseJapaneseDate = (dateStr: string): number => {
  const match = dateStr.match(/(\d+)年(\d+)月(\d+)?/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3] ? match[3].padStart(2, "0") : "15"; // "中" などの曖昧な表記は15とする
    return Number(`${year}${month}${day}`);
  }
  return 0;
};

const sortedNewsArticles = [...newsArticles].sort(
  (a, b) => parseJapaneseDate(b.date) - parseJapaneseDate(a.date),
);

export default function Home() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "center",
      loop: true,
      skipSnaps: true,
      dragFree: true,
    },
    [
      Autoplay({
        delay: 3000,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
      }),
    ],
  );
  const [prevBtnDisabled, setPrevBtnDisabled] = useState(false);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(false);

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-32 md:py-40 flex items-center justify-center text-white overflow-hidden">
        {/* Background Images */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-slide-1"
            style={{
              backgroundImage:
                "url(https://storage.googleapis.com/lumos-web-profile-data/LT.JPG)",
            }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-slide-2"
            style={{
              backgroundImage:
                "url(https://storage.googleapis.com/lumos-web-profile-data/hajipro.jpg)",
            }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-slide-3"
            style={{
              backgroundImage:
                "url(https://storage.googleapis.com/lumos-web-profile-data/study.jpg)",
            }}
          />
          <div
            className="absolute inset-0 bg-cover bg-center bg-slide-4"
            style={{
              backgroundImage:
                "url(https://storage.googleapis.com/lumos-web-profile-data/ski.jpg)",
            }}
          />
        </div>

        {/* Gradient Mask Overlay - Semi-transparent */}
        <div className="absolute inset-0 bg-gradient-primary opacity-60 z-[1]"></div>

        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px] z-[2]"></div>

        {/* Content */}
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h1 className="animate-fade-in-up text-4xl md:text-6xl font-extrabold mb-6 max-w-4xl mx-auto leading-tight tracking-tight">
            ワクワク駆動型開発。
          </h1>
          <p className="animate-fade-in-up-300 text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed font-semibold text-gradient-orange">
            Improving Together
          </p>
          <p className="animate-fade-in-up-600 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed opacity-95 font-medium text-white">
            プログラミングに興味を持つ学生たちが集い、共に学び、共に成長する。
            <br />
            ワクワクする気持ちから始まる、最高のプロジェクトを創造しましょう。
          </p>
          <div className="animate-fade-in-up-600 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gradient-orange hover:opacity-90 text-white font-semibold transition-all duration-300 hover:shadow-lg"
            >
              <Link href="/projects">プロジェクトを見る</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="font-semibold transition-all duration-300 hover:shadow-lg border-accent-foreground text-accent-foreground hover:bg-accent-foreground/10"
            >
              <Link href="/news">最新のニュース</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section-padding bg-background">
        <div className="container mx-auto container-padding">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Lumosについて
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              プログラミングに興味がある人が集まり、勉強や交流活動を行っています。
              <br />
              discordを用いたオンライン活動が中心となっています。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Code className="h-12 w-12 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  各種ハンズオン学習会
                </h3>
                <p className="text-muted-foreground">
                  初心者向けの言語学習会や第一歩を踏み出すための小規模なプロジェクトを開催しています。
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Users className="h-12 w-12 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  交流イベント
                </h3>
                <p className="text-muted-foreground">
                  ピザパーティーやBBQなどの対面イベントを開催し、メンバー同士の親睦を深めます。
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Calendar className="h-12 w-12 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">LT会</h3>
                <p className="text-muted-foreground">
                  毎週オンラインでのmini-LTに加え、対面で集合して行うLT会も開催しています。個人の成果を発表する場として、メンバーの成長を促します。
                </p>
              </CardContent>
            </Card>

            <Card className="border-border hover:border-accent-foreground hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                  <Calendar className="h-12 w-12 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  プロジェクト活動
                </h3>
                <p className="text-muted-foreground">
                  だれでも自由にプロジェクトを立ち上げることができ、メンバーと協力しながらプロジェクトを進めます。
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all duration-300 hover:shadow-lg"
            >
              <Link href="/about">
                詳しく見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto container-padding">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              お知らせ
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Lumosの最新の活動やイベント情報をお知らせします。
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4 px-4">
                {sortedNewsArticles.map((news) => (
                  <div
                    key={news.id}
                    className="flex-[0_0_85%] min-w-0 sm:flex-[0_0_45%] lg:flex-[0_0_30%]"
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border bg-card h-full">
                      <CardContent className="p-0 flex flex-col h-full">
                        <div className="p-6 flex flex-col flex-grow">
                          <p className="text-sm font-semibold text-gradient-orange mb-2">
                            {news.date}
                          </p>
                          <h3 className="text-xl font-bold mb-2 text-foreground">
                            {news.title}
                          </h3>
                          <p className="text-muted-foreground mb-2 flex-grow">
                            {news.summary}
                          </p>
                          <Link
                            href={`/news/${news.id}`}
                            className="text-accent-foreground hover:text-accent-foreground/80 font-medium inline-flex items-center transition-colors"
                          >
                            詳細を見る
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={scrollPrev}
              disabled={prevBtnDisabled}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={scrollNext}
              disabled={nextBtnDisabled}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-12 text-center">
            <Button
              asChild
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 font-semibold transition-all duration-300"
            >
              <Link href="/news">
                すべてのお知らせを見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-secondary">
        <div className="container mx-auto container-padding text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            Lumosに入ってみませんか？
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-muted-foreground">
            プログラミングができなくても大丈夫！
            <br />
            プログラミングに興味がある初心者から経験者まで誰でも大歓迎です。
          </p>
          {/* //お問い合わせページへのアクセスボタン
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-primary">
            <Link href="/contact">お問い合わせる</Link>
          </Button>
          */}
        </div>
      </section>
    </>
  );
}
