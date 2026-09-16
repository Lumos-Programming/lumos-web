/**
 * Cron から送る誕生日チャンネル通知のビルダー。
 * 個人宛ての DM ではないため、DM 用のメッセージビルダーとは分離する。
 */

import {
  sendDiscordChannelMessage,
  type DiscordMessagePayload,
} from "@/lib/discord-dm";
import type { JstToday } from "@/lib/date";

const BIRTHDAY_COLOR = 0xf59e0b; // Amber

/**
 * チャンネルへ「今日が誕生日のメンバー」を知らせる通知。
 * お祝いはタイトルで済ませ、本文はメンションの列挙だけにする。
 * 表示名は Discord のメンション（<@id>）に任せ、本文には名前を持たない。
 *
 * タイトルには日付を入れる。毎朝送られるため、後からチャンネルを遡ったときに
 * 「今日」だけではいつの通知か分からなくなるため。
 */
export function buildBirthdayNotification(
  discordIds: string[],
  today: JstToday,
): DiscordMessagePayload {
  return {
    embeds: [
      {
        title: `${today.month}月${today.day}日の誕生日!! Happy Birthday🎂`,
        description: discordIds.map((id) => `<@${id}>`).join("\n"),
        color: BIRTHDAY_COLOR,
      },
    ],
  };
}

/**
 * 環境ごとに設定された誕生日通知チャンネルへ Bot で送る。
 * 本番は専用チャンネル、非本番は運営チャンネルの ID を設定する。
 */
export async function notifyBirthdayChannel(
  payload: DiscordMessagePayload,
): Promise<void> {
  const channelId = process.env.BIRTHDAY_NOTIFICATION_CHANNEL_ID?.trim();
  if (!channelId) {
    throw new Error("BIRTHDAY_NOTIFICATION_CHANNEL_ID is not configured");
  }

  await sendDiscordChannelMessage(channelId, payload);
}
