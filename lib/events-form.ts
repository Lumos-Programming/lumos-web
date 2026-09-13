import { z } from "zod";
import { jstLocalToIso } from "@/lib/events-format";
import { EVENT_ERROR_RESPONSES, type LumosEventInput } from "@/types/event";

/**
 * 運営のイベント入力フォームの値と検証。
 * 日時は datetime-local / date の文字列のまま持ち、送信時に日本時間として ISO にする。
 * 文言はサーバー側 (parseEventInput) と揃えて、どちらで弾かれても同じ表示になるようにする。
 */
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, EVENT_ERROR_RESPONSES.TITLE_REQUIRED.message),
    allDay: z.boolean(),
    /** 時刻あり: "YYYY-MM-DDTHH:mm" / 終日: "YYYY-MM-DD" */
    start: z
      .string()
      .refine(
        (v) => jstLocalToIso(v) !== null,
        EVENT_ERROR_RESPONSES.INVALID_START_AT.message,
      ),
    /** 空なら終了なし */
    end: z
      .string()
      .refine(
        (v) => v === "" || jstLocalToIso(v) !== null,
        EVENT_ERROR_RESPONSES.INVALID_END_AT.message,
      ),
    location: z.string().trim().max(100),
    description: z.string().max(2000),
  })
  .superRefine((values, ctx) => {
    if (values.end === "") return;
    const start = jstLocalToIso(values.start);
    const end = jstLocalToIso(values.end);
    if (!start || !end) return; // 個別の refine が先に弾く
    // 終日は最終日を含む扱いなので同日を許す。時刻付きは開始より後でないと意味がない
    const tooEarly = values.allDay ? end < start : end <= start;
    if (tooEarly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end"],
        message: EVENT_ERROR_RESPONSES.END_BEFORE_START.message,
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const EMPTY_EVENT_FORM: EventFormValues = {
  title: "",
  allDay: false,
  start: "",
  end: "",
  location: "",
  description: "",
};

/** 検証済みのフォーム値を API のリクエストボディにする */
export function toEventInput(values: EventFormValues): LumosEventInput {
  return {
    title: values.title,
    description: values.description,
    startAt: jstLocalToIso(values.start)!,
    endAt: values.end ? jstLocalToIso(values.end) : null,
    allDay: values.allDay,
    location: values.location,
  };
}
