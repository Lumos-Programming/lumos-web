import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, Tag } from "lucide-react";

/** 見出しと本文の描画に必要なぶんだけ。プレビューは未保存の入力値を渡すので NewsArticle そのものではない */
export type NewsArticleViewModel = {
  title: string;
  date: string;
  category: string;
  image: string;
  body: string;
};

/**
 * お知らせの見出し部分。公開ページと管理画面のプレビューで同じものを使う。
 * (公開ページは前後に一覧へのリンクを足す)
 */
export function NewsArticleHeader({
  article,
  children,
}: {
  article: NewsArticleViewModel;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      {children}
      <h1 className="text-3xl md:text-4xl font-bold mb-4">
        {article.title || "(タイトル未入力)"}
      </h1>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          {article.date || "(日付未入力)"}
        </div>
        <div className="flex items-center">
          <Tag className="mr-2 h-4 w-4" />
          <span className="bg-accent/20 text-white px-2 py-0.5 rounded-full">
            {article.category}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * アイキャッチと本文。公開ページと管理画面のプレビューで同じものを使うことで、
 * prose のクラスがズレて「プレビューでは崩れていなかったのに公開したら崩れる」のを防ぐ。
 */
export function NewsArticleBody({
  article,
}: {
  article: NewsArticleViewModel;
}) {
  return (
    <>
      {article.image ? (
        <div className="mb-8 rounded-lg overflow-hidden">
          <Image
            src={article.image}
            alt={article.title}
            width={1200}
            height={600}
            className="w-full object-contain max-h-96"
          />
        </div>
      ) : null}

      <div className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {article.body || "_本文がまだ空です_"}
        </ReactMarkdown>
      </div>
    </>
  );
}
