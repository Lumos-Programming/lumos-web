import { addDays, dateKeyToIso, toDateKey } from "@/lib/events-format";
import { deleteMiniLtEvent, upsertMiniLtEvent } from "@/lib/events";
import { getWeekData, type SerializableWeekData } from "@/lib/mini-lt/firebase";
import {
  EVENT_CONFIG,
  formatWeekIsoLabel,
  getWeekDateFromWeekId,
  isValidWeekId,
  type EventConfig,
} from "@/lib/mini-lt/utils";
import type { LumosEventInput } from "@/types/event";

/**
 * mini LT の週をサークル内イベントカレンダー (`events` コレクション) に載せる。
 * 発表の登録・編集・削除と Discord イベント作成のたびに呼び、内容を週データに揃える。
 */

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const START_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MINI_LT_URL = "https://mini-lt.lumos-ynu.jp";

/** 週 ID の週のうち、開催曜日の日付キー (日本時間) */
function eventDateKey(weekId: string, config: EventConfig) {
  // getWeekDateFromWeekId はローカル時刻の 0:00 なので、ローカルの年月日がそのまま月曜の日付
  const monday = getWeekDateFromWeekId(weekId);
  const mondayKey = toDateKey({
    year: monday.getFullYear(),
    month: monday.getMonth() + 1,
    day: monday.getDate(),
  });
  // ISO 週は月曜始まり。日曜 (0) は週の最後になる
  return addDays(mondayKey, (config.dayOfWeek + 6) % 7);
}

/** "21:00" → 開始日 0:00 からの経過ミリ秒。壊れた値なら設定の開始時刻を使う */
function startOffsetMs(eventStartTime: string, config: EventConfig): number {
  const match = START_TIME_PATTERN.exec(eventStartTime);
  if (!match) return config.startHour * HOUR_MS;
  return Number(match[1]) * HOUR_MS + Number(match[2]) * MINUTE_MS;
}

function buildDescription(data: SerializableWeekData): string {
  const talkList = [...data.talks]
    .sort((a, b) => a.order - b.order)
    .map(
      (talk, idx) =>
        `${idx + 1}. ${talk.title} - ${talk.presenterName} (${talk.duration}分)`,
    )
    .join("\n");
  return `発表予定\n${talkList}\n\n詳細: ${MINI_LT_URL}`;
}

/** 週データからカレンダーのイベント内容を組み立てる */
export function buildMiniLtEventInput(
  weekId: string,
  data: SerializableWeekData,
  config: EventConfig = EVENT_CONFIG,
): LumosEventInput {
  const dayStart = new Date(dateKeyToIso(eventDateKey(weekId, config)));
  const start = new Date(
    dayStart.getTime() + startOffsetMs(data.eventStartTime, config),
  );
  const end = new Date(dayStart.getTime() + config.endHour * HOUR_MS);

  return {
    title: `mini LT (${formatWeekIsoLabel(weekId)})`,
    description: buildDescription(data),
    startAt: start.toISOString(),
    // 開始時刻を遅らせて終了を越えた場合は終了を出さない
    endAt: end > start ? end.toISOString() : null,
    allDay: false,
    location: "Discord ボイスチャンネル",
  };
}

/**
 * 週データをカレンダーに反映する。
 * 発表が 1 件もない週は開催予定として扱わず、カレンダーから外す
 * (Discord イベントも発表が入ってから作るのに合わせる)。
 */
export async function syncMiniLtCalendarEvent(weekId: string): Promise<void> {
  if (!isValidWeekId(weekId)) throw new Error("Invalid week ID");
  const data = await getWeekData(weekId);
  if (data.talks.length === 0) {
    await deleteMiniLtEvent(weekId);
    return;
  }
  await upsertMiniLtEvent(weekId, buildMiniLtEventInput(weekId, data));
}
