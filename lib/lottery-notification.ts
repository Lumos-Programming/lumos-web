import {
  sendDiscordChannelMessage,
  type DiscordMessagePayload,
} from "@/lib/discord-dm";
import { PRIZE_TIERS, type LotteryDraw } from "@/types/lottery";

const LOTTERY_COLOR = 0xa855f7; // Purple

/** 抽選結果の Discord 投稿。当選者はメンションで出す */
export function buildLotteryNotification(
  draw: LotteryDraw,
  resultUrl: string,
): DiscordMessagePayload {
  const [, month, day] = draw.drawId.split("-").map(Number);
  const lines = PRIZE_TIERS.flatMap((tier) => {
    const ids = draw.winners
      .filter((w) => w.tier === tier.tier)
      .map((w) => `<@${w.memberId}>`);
    return ids.length > 0
      ? [`**${tier.label}** (${tier.prize})`, ids.join(" "), ""]
      : [];
  });

  return {
    embeds: [
      {
        title: `🎰 ${month}月${day}日の週次宝くじ 抽選結果`,
        description: [
          ...lines,
          `参加 ${draw.participants} 人 / チケット ${draw.totalTickets} 枚`,
          "景品は今日の作業会 (18:00〜) で渡します。来られない人は次回以降に持ち越しです。",
          `結果ページ: ${resultUrl}`,
        ].join("\n"),
        color: LOTTERY_COLOR,
      },
    ],
  };
}

/**
 * 環境ごとの LOTTERY_NOTIFICATION_CHANNEL_ID へ送る。
 * 未設定なら送らずに false を返す (抽選自体は成功させる)。
 */
export async function notifyLotteryChannel(
  payload: DiscordMessagePayload,
): Promise<boolean> {
  const channelId = process.env.LOTTERY_NOTIFICATION_CHANNEL_ID?.trim();
  if (!channelId) {
    console.warn("LOTTERY_NOTIFICATION_CHANNEL_ID is not configured");
    return false;
  }
  await sendDiscordChannelMessage(channelId, payload);
  return true;
}
