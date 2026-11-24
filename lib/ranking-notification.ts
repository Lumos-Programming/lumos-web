import {
  sendDiscordChannelMessage,
  type DiscordMessagePayload,
} from "@/lib/discord-dm";
import { RANKING_PRIZE_NOTE, type MonthlyRanking } from "@/types/ranking";

const RANKING_COLOR = 0xeab308; // Yellow

/** 月間ランキング確定の Discord 投稿。表彰対象はメンションで出す */
export function buildRankingNotification(
  ranking: MonthlyRanking,
  resultUrl: string,
): DiscordMessagePayload {
  const [year, month] = ranking.month.split("-").map(Number);
  const lines = ranking.honorees.map(
    (e) => `**${e.rank}位** <@${e.memberId}> (${e.points} pt)`,
  );
  return {
    embeds: [
      {
        title: `🏆 ${year}年${month}月の月間ランキング 表彰`,
        description: [
          ...lines,
          "",
          `${RANKING_PRIZE_NOTE}。`,
          `ランキングページ: ${resultUrl}`,
        ].join("\n"),
        color: RANKING_COLOR,
      },
    ],
  };
}

/**
 * RANKING_NOTIFICATION_CHANNEL_ID (未設定なら LOTTERY_NOTIFICATION_CHANNEL_ID) へ送る。
 * どちらも未設定なら送らずに false を返す (確定自体は成功させる)。
 */
export async function notifyRankingChannel(
  payload: DiscordMessagePayload,
): Promise<boolean> {
  const channelId =
    process.env.RANKING_NOTIFICATION_CHANNEL_ID?.trim() ||
    process.env.LOTTERY_NOTIFICATION_CHANNEL_ID?.trim();
  if (!channelId) {
    console.warn(
      "RANKING_NOTIFICATION_CHANNEL_ID / LOTTERY_NOTIFICATION_CHANNEL_ID is not configured",
    );
    return false;
  }
  await sendDiscordChannelMessage(channelId, payload);
  return true;
}
