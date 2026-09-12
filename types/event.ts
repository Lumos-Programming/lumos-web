/**
 * イベントの出どころ。
 * "manual" は運営がダッシュボードから入力したもの。
 * "mini-lt" は mini-LT の週データから取り込んだもの (取り込み機能は別 issue)。
 */
export const EVENT_SOURCES = ["manual", "mini-lt"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

/**
 * サークル内イベント 1 件。Firestore の Timestamp は ISO 文字列に変換済みなので
 * そのまま Client Component に渡せる。
 *
 * 日時はすべて日本時間で入力・表示する。保存は UTC の Timestamp なので、
 * 表示側は必ず Asia/Tokyo で整形する (lib/events-format.ts)。
 */
export interface CircleEvent {
  id: string;
  title: string;
  /** 説明 (プレーンテキスト。改行はそのまま表示する) */
  description: string;
  /** 開始日時 (ISO 8601)。終日イベントは日本時間 0:00 */
  startAt: string;
  /**
   * 終了日時 (ISO 8601)。未設定なら null。
   * 終日イベントでは最終日の日本時間 0:00 を入れる (最終日を含む)。
   */
  endAt: string | null;
  allDay: boolean;
  location: string;
  source: EventSource;
  /** mini-LT から取り込んだ場合の週 ID ("2026-W12")。手入力なら null */
  sourceRef: string | null;
  /** 作成した運営の Discord ID */
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export function isEventSource(value: unknown): value is EventSource {
  return EVENT_SOURCES.includes(value as EventSource);
}

/** 開始が早い順。サーバーの一覧と管理 UI の楽観更新で同じ並びを使う */
export function byStartAtAsc(a: CircleEvent, b: CircleEvent): number {
  return a.startAt.localeCompare(b.startAt);
}

/**
 * イベントまわりのエラーコード。lib と API ルートの両方がこれを見るので、
 * 例外メッセージの文字列比較でハンドリングしない。
 */
export const EVENT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  TITLE_REQUIRED: "TITLE_REQUIRED",
  INVALID_START_AT: "INVALID_START_AT",
  INVALID_END_AT: "INVALID_END_AT",
  END_BEFORE_START: "END_BEFORE_START",
  NOT_FOUND: "NOT_FOUND",
} as const;
export type EventErrorCode =
  (typeof EVENT_ERROR_CODES)[keyof typeof EVENT_ERROR_CODES];

/** ユーザーに見せる文言と HTTP ステータス */
export const EVENT_ERROR_RESPONSES: Record<
  EventErrorCode,
  { status: number; message: string }
> = {
  INVALID_INPUT: { status: 400, message: "入力の形式が正しくありません" },
  TITLE_REQUIRED: { status: 400, message: "タイトルを入力してください" },
  INVALID_START_AT: { status: 400, message: "開始日時を入力してください" },
  INVALID_END_AT: { status: 400, message: "終了日時の形式が正しくありません" },
  END_BEFORE_START: {
    status: 400,
    message: "終了日時は開始日時より後にしてください",
  },
  NOT_FOUND: { status: 404, message: "イベントが見つかりません" },
};

export class EventError extends Error {
  readonly code: EventErrorCode;

  constructor(code: EventErrorCode) {
    super(EVENT_ERROR_RESPONSES[code].message);
    this.name = "EventError";
    this.code = code;
  }
}
