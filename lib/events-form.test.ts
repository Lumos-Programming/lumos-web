import { describe, it, expect } from "vitest";
import { EMPTY_EVENT_FORM, eventFormSchema, toEventInput } from "./events-form";

const valid = {
  ...EMPTY_EVENT_FORM,
  title: " 新歓 ",
  start: "2026-10-05T19:00",
  end: "2026-10-05T21:00",
};

function firstError(values: typeof valid): string | null {
  const parsed = eventFormSchema.safeParse(values);
  return parsed.success ? null : parsed.error.issues[0].message;
}

describe("eventFormSchema", () => {
  it("accepts a valid form and converts it to JST ISO", () => {
    const parsed = eventFormSchema.parse(valid);
    expect(parsed.title).toBe("新歓");
    expect(toEventInput(parsed)).toEqual({
      title: "新歓",
      description: "",
      startAt: "2026-10-05T10:00:00.000Z",
      endAt: "2026-10-05T12:00:00.000Z",
      allDay: false,
      location: "",
    });
  });

  it("treats an empty end as no end", () => {
    const parsed = eventFormSchema.parse({ ...valid, end: "" });
    expect(toEventInput(parsed).endAt).toBeNull();
  });

  it("requires title and a parsable start", () => {
    expect(firstError({ ...valid, title: "  " })).toBe(
      "タイトルを入力してください",
    );
    expect(firstError({ ...valid, start: "" })).toBe(
      "開始日時を入力してください",
    );
    expect(firstError({ ...valid, end: "soon" })).toBe(
      "終了日時の形式が正しくありません",
    );
  });

  it("rejects an end before (or at) the start for timed events", () => {
    expect(firstError({ ...valid, end: "2026-10-05T19:00" })).toBe(
      "終了日時は開始日時より後にしてください",
    );
    expect(firstError({ ...valid, end: "2026-10-04T19:00" })).toBe(
      "終了日時は開始日時より後にしてください",
    );
  });

  it("allows an all-day event to end on the same day", () => {
    expect(
      firstError({
        ...valid,
        allDay: true,
        start: "2026-10-05",
        end: "2026-10-05",
      }),
    ).toBeNull();
    expect(
      firstError({
        ...valid,
        allDay: true,
        start: "2026-10-05",
        end: "2026-10-04",
      }),
    ).toBe("終了日時は開始日時より後にしてください");
  });
});
