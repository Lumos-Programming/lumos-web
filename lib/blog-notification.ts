/**
 * ブログ記事の新規登録を Discord の専用チャンネルへ知らせる通知。
 * 編集・削除では送らない (登録のたびに 1 回だけ流す)。
 */

import {
  sendDiscordChannelMessage,
  type DiscordMessagePayload,
} from "@/lib/discord-dm";
import type { Blog } from "@/types/blog";

const BLOG_COLOR = 0x667eea; // ブログ一覧ページのヘッダー (メイングラデーションの開始色) に合わせる

/** Discord の Embed のタイトルは 256 文字まで */
const MAX_TITLE_LENGTH = 256;
/** 説明はチャンネルで流し読みできる長さに切る */
const MAX_DESCRIPTION_LENGTH = 200;

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
}

/**
 * 書いた人は Discord のメンション (<@id>) で出す。表示名は Discord に任せ、本文には名前を持たない。
 * タイトルは元記事へのリンクにし、サムネイルがあれば大きく出す。
 */
export function buildBlogNotification(blog: Blog): DiscordMessagePayload {
  const lines = [`<@${blog.authorId}> さんが新しい記事を書きました！`];
  if (blog.description) {
    lines.push("", truncate(blog.description, MAX_DESCRIPTION_LENGTH));
  }

  const fields = [{ name: "公開日", value: blog.publishedAt, inline: true }];
  if (blog.platform) {
    fields.unshift({ name: "媒体", value: blog.platform, inline: true });
  }

  return {
    embeds: [
      {
        title: truncate(blog.title, MAX_TITLE_LENGTH),
        url: blog.url,
        description: lines.join("\n"),
        color: BLOG_COLOR,
        fields,
        ...(blog.thumbnailUrl ? { image: { url: blog.thumbnailUrl } } : {}),
      },
    ],
  };
}

/**
 * 環境ごとに設定されたブログ通知チャンネルへ Bot で送る。
 * BLOG_NOTIFICATION_CHANNEL_ID が未設定 (空文字 / 空白のみ) の環境では送らない。
 */
export async function notifyBlogChannel(
  payload: DiscordMessagePayload,
): Promise<void> {
  const channelId = process.env.BLOG_NOTIFICATION_CHANNEL_ID?.trim();
  if (!channelId) return;

  await sendDiscordChannelMessage(channelId, payload);
}
