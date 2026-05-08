import { describe, it, expect } from "vitest";
import {
  getWeekId,
  getRelativeWeekId,
  isDuringEvent,
  getNavigationWeeks,
  getNextEventWeekId,
  getWeekLabel,
  getNextEventDate,
  EVENT_CONFIG,
  type EventConfig,
} from "./utils";

// ヘルパー関数: 指定した曜日と時刻のDateオブジェクトを生成
function createDateForDayAndTime(
  dayOfWeek: number,
  hour: number,
  minute: number = 0,
): Date {
  // 基準日として2026-03-02（月曜日）を使用
  const baseMonday = new Date("2026-03-02T00:00:00");
  const baseDayOfWeek = baseMonday.getDay(); // 1 (月曜日)

  // 基準日から目標曜日までのオフセットを計算
  let dayOffset = dayOfWeek - baseDayOfWeek;
  if (dayOffset < 0) dayOffset += 7;

  const targetDate = new Date(baseMonday);
  targetDate.setDate(baseMonday.getDate() + dayOffset);
  targetDate.setHours(hour, minute, 0, 0);

  return targetDate;
}

// ヘルパー関数: 翌日の曜日を取得
function getNextDay(dayOfWeek: number): number {
  return (dayOfWeek + 1) % 7;
}

// ヘルパー関数: イベント日と翌日以外の曜日を取得
function getOtherDays(eventDay: number): number[] {
  const nextDay = getNextDay(eventDay);
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (i !== eventDay && i !== nextDay) {
      days.push(i);
    }
  }
  return days;
}

// getThisWeekEventStateの判定に応じた曜日リスト
function getDaysPast(eventDay: number): number[] {
  const days: number[] = [];
  for (let d = 0; d < 7; d++) {
    if (d > eventDay) {
      days.push(d);
    }
  }
  return days;
}

function getDaysUpcoming(eventDay: number): number[] {
  const days: number[] = [];
  for (let d = 0; d < 7; d++) {
    if (d < eventDay) {
      days.push(d);
    }
  }
  return days;
}

describe("週次ロジックのテスト", () => {
  describe("isDuringEvent", () => {
    it("イベント開催中はtrueを返す", () => {
      const eventStart = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour,
        0,
      );
      const eventMid = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour,
        30,
      );
      const eventNearEnd = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.endHour - 1,
        59,
      );

      expect(isDuringEvent(eventStart)).toBe(true);
      expect(isDuringEvent(eventMid)).toBe(true);
      expect(isDuringEvent(eventNearEnd)).toBe(true);
    });

    it("イベント開始前はfalseを返す", () => {
      const beforeEvent = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour - 1,
        59,
      );
      expect(isDuringEvent(beforeEvent)).toBe(false);
    });

    it("イベント終了後はfalseを返す", () => {
      const nextDay = getNextDay(EVENT_CONFIG.dayOfWeek);
      const afterEvent = createDateForDayAndTime(nextDay, 0, 0);
      const afterEventPlus1 = createDateForDayAndTime(nextDay, 1, 0);

      expect(isDuringEvent(afterEvent)).toBe(false);
      expect(isDuringEvent(afterEventPlus1)).toBe(false);
    });

    it("イベント開催日以外の曜日はfalseを返す", () => {
      const otherDays = getOtherDays(EVENT_CONFIG.dayOfWeek);

      otherDays.forEach((day) => {
        const testDate = createDateForDayAndTime(
          day,
          EVENT_CONFIG.startHour,
          0,
        );
        expect(isDuringEvent(testDate)).toBe(false);
      });
    });
  });

  describe("getNavigationWeeks", () => {
    describe("イベント開催中", () => {
      it("前回=先週、今回=今週、次回=来週を返す（イベント開始時）", () => {
        const duringEvent = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek,
          EVENT_CONFIG.startHour,
          30,
        );
        const result = getNavigationWeeks(duringEvent);
        const currentWeek = getWeekId(duringEvent);

        expect(result.centerWeek).toBe(currentWeek);
        expect(result.centerLabel).toBe("今回");
        expect(result.rightLabel).toBe("次回");
      });

      it("前回=先週、今回=今週、次回=来週を返す（イベント終了間際）", () => {
        const nearEnd = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek,
          EVENT_CONFIG.endHour - 1,
          30,
        );
        const result = getNavigationWeeks(nearEnd);
        const currentWeek = getWeekId(nearEnd);

        expect(result.centerWeek).toBe(currentWeek);
        expect(result.centerLabel).toBe("今回");
        expect(result.rightLabel).toBe("次回");
      });
    });

    describe("イベント開催外", () => {
      it("前回=先週、次回=今週、次々回=来週を返す（イベント開始前、当日）", () => {
        const beforeEvent = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek,
          EVENT_CONFIG.startHour - 1,
          59,
        );
        const result = getNavigationWeeks(beforeEvent);
        const currentWeek = getWeekId(beforeEvent);

        expect(result.prevWeek).toBe(getRelativeWeekId(-1, beforeEvent));
        expect(result.centerWeek).toBe(currentWeek);
        expect(result.centerLabel).toBe("次回");
        expect(result.rightLabel).toBe("次々回");
      });

      it("前回=先週、次回=今週、次々回=来週を返す（イベント日より前の曜日）", () => {
        const upcomingDays = getDaysUpcoming(EVENT_CONFIG.dayOfWeek);
        const beforeDay = createDateForDayAndTime(upcomingDays[0], 15, 0);
        const result = getNavigationWeeks(beforeDay);
        const expectedCenterWeek = getWeekId(getNextEventDate(beforeDay));

        expect(result.prevWeek).toBe(
          getRelativeWeekId(-1, getNextEventDate(beforeDay)),
        );
        expect(result.centerWeek).toBe(expectedCenterWeek);
        expect(result.centerLabel).toBe("次回");
        expect(result.rightLabel).toBe("次々回");
      });

      it("前回=今週、次回=来週、次々回=再来週を返す（イベント終了後）", () => {
        const nextDay = getNextDay(EVENT_CONFIG.dayOfWeek);
        const afterEvent = createDateForDayAndTime(nextDay, 0, 0);
        const result = getNavigationWeeks(afterEvent);
        const currentWeek = getWeekId(afterEvent);

        expect(result.prevWeek).toBe(currentWeek);
        expect(result.centerLabel).toBe("次回");
        expect(result.rightLabel).toBe("次々回");
      });

      it("前回=今週、次回=来週、次々回=再来週を返す（イベント日より後の曜日）", () => {
        const pastDays = getDaysPast(EVENT_CONFIG.dayOfWeek);
        const afterDay = createDateForDayAndTime(pastDays[0], 15, 0);
        const result = getNavigationWeeks(afterDay);
        const currentWeek = getWeekId(afterDay);

        expect(result.prevWeek).toBe(currentWeek);
        expect(result.centerLabel).toBe("次回");
        expect(result.rightLabel).toBe("次々回");
      });
    });
  });

  describe("getNextEventWeekId", () => {
    it("イベント開催中は今週を返す", () => {
      const duringEvent = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour,
        30,
      );
      const currentWeek = getWeekId(duringEvent);
      expect(getNextEventWeekId(duringEvent)).toBe(currentWeek);
    });

    it("イベント開始前（当日）は今週を返す", () => {
      const beforeEvent = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour - 1,
        59,
      );
      const currentWeek = getWeekId(beforeEvent);
      expect(getNextEventWeekId(beforeEvent)).toBe(currentWeek);
    });

    it("イベント日より前の曜日は次のイベント週を返す", () => {
      const upcomingDays = getDaysUpcoming(EVENT_CONFIG.dayOfWeek);
      const beforeDay = createDateForDayAndTime(upcomingDays[0], 15, 0);
      const expectedWeek = getWeekId(getNextEventDate(beforeDay));
      expect(getNextEventWeekId(beforeDay)).toBe(expectedWeek);
    });

    it("イベント終了後は来週を返す", () => {
      const nextDay = getNextDay(EVENT_CONFIG.dayOfWeek);
      const afterEvent = createDateForDayAndTime(nextDay, 0, 0);
      const nextWeek = getWeekId(
        new Date(afterEvent.getTime() + 7 * 24 * 60 * 60 * 1000),
      );
      expect(getNextEventWeekId(afterEvent)).toBe(nextWeek);
    });
  });

  describe("getWeekLabel", () => {
    describe("イベント開催中", () => {
      it("先週は「前回」とラベル付けされる", () => {
        const duringEvent = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek,
          EVENT_CONFIG.startHour,
          30,
        );
        const { prevWeek } = getNavigationWeeks(duringEvent);
        expect(getWeekLabel(prevWeek, duringEvent)).toBe("前回");
      });

      it("今週は「今回」とラベル付けされる", () => {
        const duringEvent = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek,
          EVENT_CONFIG.startHour,
          30,
        );
        const { centerWeek } = getNavigationWeeks(duringEvent);
        expect(getWeekLabel(centerWeek, duringEvent)).toBe("今回");
      });

      it("来週は「次回」とラベル付けされる", () => {
        const duringEvent = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek,
          EVENT_CONFIG.startHour,
          30,
        );
        const { nextWeek } = getNavigationWeeks(duringEvent);
        expect(getWeekLabel(nextWeek, duringEvent)).toBe("次回");
      });
    });

    describe("イベント開催外", () => {
      it("今週は「前回」とラベル付けされる", () => {
        const otherDays = getOtherDays(EVENT_CONFIG.dayOfWeek);
        const notDuringEvent = createDateForDayAndTime(otherDays[0], 15, 0);
        const { prevWeek } = getNavigationWeeks(notDuringEvent);
        expect(getWeekLabel(prevWeek, notDuringEvent)).toBe("前回");
      });

      it("来週は「次回」とラベル付けされる", () => {
        const otherDays = getOtherDays(EVENT_CONFIG.dayOfWeek);
        const notDuringEvent = createDateForDayAndTime(otherDays[0], 15, 0);
        const { centerWeek } = getNavigationWeeks(notDuringEvent);
        expect(getWeekLabel(centerWeek, notDuringEvent)).toBe("次回");
      });

      it("再来週は「次々回」とラベル付けされる", () => {
        const otherDays = getOtherDays(EVENT_CONFIG.dayOfWeek);
        const notDuringEvent = createDateForDayAndTime(otherDays[0], 15, 0);
        const { nextWeek } = getNavigationWeeks(notDuringEvent);
        expect(getWeekLabel(nextWeek, notDuringEvent)).toBe("次々回");
      });
    });

    describe("エッジケース", () => {
      it("ナビゲーション週に含まれない週は「今週」を返す", () => {
        const notDuringEvent = createDateForDayAndTime(
          EVENT_CONFIG.dayOfWeek + 1,
          15,
          0,
        );
        const farPastWeek = "2026-W01";
        expect(getWeekLabel(farPastWeek, notDuringEvent)).toBe("今週");
      });
    });
  });

  describe("EVENT_CONFIGの柔軟性", () => {
    it("設定値が妥当であること", () => {
      expect(EVENT_CONFIG.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(EVENT_CONFIG.dayOfWeek).toBeLessThanOrEqual(6);
      expect(EVENT_CONFIG.startHour).toBeGreaterThanOrEqual(0);
      expect(EVENT_CONFIG.startHour).toBeLessThan(24);
      expect(EVENT_CONFIG.endHour).toBeGreaterThan(EVENT_CONFIG.startHour);
      expect(EVENT_CONFIG.endHour).toBeLessThanOrEqual(24);
    });

    it("任意の妥当なEVENT_CONFIGで正しく動作すること", () => {
      // すべてのロジックがEVENT_CONFIGに適応することを実証
      // ヘルパー関数はEVENT_CONFIGに基づいて動的にテスト日時を生成
      const duringEvent = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour,
        0,
      );
      const beforeEvent = createDateForDayAndTime(
        EVENT_CONFIG.dayOfWeek,
        EVENT_CONFIG.startHour - 1,
        59,
      );

      // ロジックが正しく適応することを確認
      expect(isDuringEvent(duringEvent)).toBe(true);
      expect(isDuringEvent(beforeEvent)).toBe(false);

      // ナビゲーションが正しく適応することを確認
      const duringNav = getNavigationWeeks(duringEvent);
      const beforeNav = getNavigationWeeks(beforeEvent);

      expect(duringNav.centerLabel).toBe("今回");
      expect(beforeNav.centerLabel).toBe("次回");
    });
  });

  describe("getNextEventDate", () => {
    it("イベント日（月曜日）が渡された場合、その日をそのまま返す", () => {
      const monday = createDateForDayAndTime(1, 10, 0); // 月曜日 10:00
      const result = getNextEventDate(monday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(monday.getDate());
    });

    it("火曜日が渡された場合、次の月曜日を返す", () => {
      const tuesday = createDateForDayAndTime(2, 10, 0); // 火曜日 10:00
      const result = getNextEventDate(tuesday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(tuesday.getDate() + 6); // 6日後の月曜日
    });

    it("水曜日が渡された場合、次の月曜日を返す", () => {
      const wednesday = createDateForDayAndTime(3, 10, 0); // 水曜日 10:00
      const result = getNextEventDate(wednesday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(wednesday.getDate() + 5); // 5日後の月曜日
    });

    it("日曜日が渡された場合、次の月曜日を返す", () => {
      const sunday = createDateForDayAndTime(0, 10, 0); // 日曜日 10:00
      const result = getNextEventDate(sunday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(sunday.getDate() + 1); // 1日後の月曜日
    });

    it("土曜日が渡された場合、次の月曜日を返す", () => {
      const saturday = createDateForDayAndTime(6, 10, 0); // 土曜日 10:00
      const result = getNextEventDate(saturday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(saturday.getDate() + 2); // 2日後の月曜日
    });

    it("異なるEVENT_CONFIGで正しく動作する（水曜日イベント）", () => {
      const wednesdayConfig: EventConfig = {
        dayOfWeek: 3, // 水曜日
        startHour: 19,
        endHour: 20,
      };

      // 月曜日から水曜日を探す
      const monday = createDateForDayAndTime(1, 10, 0);
      const result = getNextEventDate(monday, wednesdayConfig);
      expect(result.getDay()).toBe(3); // Wednesday
      expect(result.getDate()).toBe(monday.getDate() + 2);

      // 水曜日は水曜日を返す
      const wednesday = createDateForDayAndTime(3, 10, 0);
      const result2 = getNextEventDate(wednesday, wednesdayConfig);
      expect(result2.getDay()).toBe(3);
      expect(result2.getDate()).toBe(wednesday.getDate());

      // 木曜日から次の水曜日を探す
      const thursday = createDateForDayAndTime(4, 10, 0);
      const result3 = getNextEventDate(thursday, wednesdayConfig);
      expect(result3.getDay()).toBe(3);
      expect(result3.getDate()).toBe(thursday.getDate() + 6);
    });

    it("異なるEVENT_CONFIGで正しく動作する（日曜日イベント）", () => {
      const sundayConfig: EventConfig = {
        dayOfWeek: 0, // 日曜日
        startHour: 10,
        endHour: 12,
      };

      // 月曜日から日曜日を探す
      const monday = createDateForDayAndTime(1, 10, 0);
      const result = getNextEventDate(monday, sundayConfig);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBe(monday.getDate() + 6);

      // 土曜日から日曜日を探す
      const saturday = createDateForDayAndTime(6, 10, 0);
      const result2 = getNextEventDate(saturday, sundayConfig);
      expect(result2.getDay()).toBe(0);
      expect(result2.getDate()).toBe(saturday.getDate() + 1);

      // 日曜日は日曜日を返す
      const sunday = createDateForDayAndTime(0, 10, 0);
      const result3 = getNextEventDate(sunday, sundayConfig);
      expect(result3.getDay()).toBe(0);
      expect(result3.getDate()).toBe(sunday.getDate());
    });

    it("元のDateオブジェクトを変更しないこと", () => {
      const original = createDateForDayAndTime(2, 10, 0); // 火曜日
      const originalDate = original.getDate();
      const result = getNextEventDate(original);

      // 元のオブジェクトが変更されていないことを確認
      expect(original.getDate()).toBe(originalDate);
      expect(original.getDay()).toBe(2);

      // 結果は異なるオブジェクトであることを確認
      expect(result).not.toBe(original);
    });
  });

  // 異なるイベント設定でテストして柔軟性を証明
  describe("異なるEVENT_CONFIGのシナリオ", () => {
    it("水曜日 19:00-20:00 のイベントで正しく動作すること", () => {
      const wednesdayConfig: EventConfig = {
        dayOfWeek: 3, // 水曜日
        startHour: 19,
        endHour: 20,
      };

      // 水曜日 19:30（イベント中）
      const duringEvent = createDateForDayAndTime(3, 19, 30);
      expect(isDuringEvent(duringEvent, wednesdayConfig)).toBe(true);

      const { centerLabel } = getNavigationWeeks(duringEvent, wednesdayConfig);
      expect(centerLabel).toBe("今回");

      // 水曜日 18:59（イベント前）
      const beforeEvent = createDateForDayAndTime(3, 18, 59);
      expect(isDuringEvent(beforeEvent, wednesdayConfig)).toBe(false);

      // 木曜日 10:00（イベント後）
      const afterEvent = createDateForDayAndTime(4, 10, 0);
      expect(isDuringEvent(afterEvent, wednesdayConfig)).toBe(false);

      const { centerLabel: afterLabel } = getNavigationWeeks(
        afterEvent,
        wednesdayConfig,
      );
      expect(afterLabel).toBe("次回");
    });

    it("金曜日 18:00-21:00 のイベントで正しく動作すること", () => {
      const fridayConfig: EventConfig = {
        dayOfWeek: 5, // 金曜日
        startHour: 18,
        endHour: 21,
      };

      // 金曜日 18:00（イベント開始）
      const eventStart = createDateForDayAndTime(5, 18, 0);
      expect(isDuringEvent(eventStart, fridayConfig)).toBe(true);

      // 金曜日 20:59（イベント中）
      const eventEnd = createDateForDayAndTime(5, 20, 59);
      expect(isDuringEvent(eventEnd, fridayConfig)).toBe(true);

      // 金曜日 21:00（イベント後）
      const afterEvent = createDateForDayAndTime(5, 21, 0);
      expect(isDuringEvent(afterEvent, fridayConfig)).toBe(false);

      const nextEventWeek = getNextEventWeekId(eventStart, fridayConfig);
      const currentWeek = getWeekId(eventStart);
      expect(nextEventWeek).toBe(currentWeek);

      const nextEventWeekAfter = getNextEventWeekId(afterEvent, fridayConfig);
      expect(nextEventWeekAfter).toBe(currentWeek);
    });

    it("日曜日 10:00-12:00 の朝イベントで正しく動作すること", () => {
      const sundayConfig: EventConfig = {
        dayOfWeek: 0, // 日曜日
        startHour: 10,
        endHour: 12,
      };

      // 日曜日 11:00（イベント中）
      const duringEvent = createDateForDayAndTime(0, 11, 0);
      expect(isDuringEvent(duringEvent, sundayConfig)).toBe(true);

      const { prevWeek, centerWeek, nextWeek, centerLabel, rightLabel } =
        getNavigationWeeks(duringEvent, sundayConfig);

      expect(centerLabel).toBe("今回");
      expect(rightLabel).toBe("次回");

      // 週ラベルが正しく動作することを確認
      expect(getWeekLabel(prevWeek, duringEvent, sundayConfig)).toBe("前回");
      expect(getWeekLabel(centerWeek, duringEvent, sundayConfig)).toBe("今回");
      expect(getWeekLabel(nextWeek, duringEvent, sundayConfig)).toBe("次回");

      // 月曜日 14:00（イベント外）
      const notDuringEvent = createDateForDayAndTime(1, 14, 0);
      expect(isDuringEvent(notDuringEvent, sundayConfig)).toBe(false);

      const { centerLabel: centerLabel2, rightLabel: rightLabel2 } =
        getNavigationWeeks(notDuringEvent, sundayConfig);
      expect(centerLabel2).toBe("次回");
      expect(rightLabel2).toBe("次々回");
    });

    it("土曜日 22:00-24:00 の深夜イベントで正しく動作すること", () => {
      const saturdayConfig: EventConfig = {
        dayOfWeek: 6, // 土曜日
        startHour: 22,
        endHour: 24,
      };

      // 土曜日 23:30（イベント中）
      const duringEvent = createDateForDayAndTime(6, 23, 30);
      expect(isDuringEvent(duringEvent, saturdayConfig)).toBe(true);

      // 日曜日 00:00（深夜0時でイベント終了後）
      const afterMidnight = createDateForDayAndTime(0, 0, 0);
      expect(isDuringEvent(afterMidnight, saturdayConfig)).toBe(false);
    });
  });
});

// 2026-03-30(月)〜2026-04-05(日) の実際の日付を使ったテーブルテスト
// ISO週: 2026-W14, イベント: 月曜21:00〜24:00
describe("先週(2026-W14)の実際の日付によるテーブルテスト", () => {
  // EVENT_CONFIGが変わってもテストが壊れないよう固定値を使用
  const config: EventConfig = {
    dayOfWeek: 1, // 月曜日
    startHour: 21,
    endHour: 24,
  };

  // getWeekId: 先週の全日付が同じISO週になることを検証（configに依存しない）
  describe("getWeekId", () => {
    const weekIdCases = [
      { date: "2026-03-30T12:00:00", label: "3/30(月)", expected: "2026-W14" },
      { date: "2026-03-31T12:00:00", label: "3/31(火)", expected: "2026-W14" },
      { date: "2026-04-01T12:00:00", label: "4/1(水)", expected: "2026-W14" },
      { date: "2026-04-02T12:00:00", label: "4/2(木)", expected: "2026-W14" },
      { date: "2026-04-03T12:00:00", label: "4/3(金)", expected: "2026-W14" },
      { date: "2026-04-04T12:00:00", label: "4/4(土)", expected: "2026-W14" },
      { date: "2026-04-05T12:00:00", label: "4/5(日)", expected: "2026-W14" },
    ];

    it.each(weekIdCases)("$label → $expected", ({ date, expected }) => {
      expect(getWeekId(new Date(date))).toBe(expected);
    });
  });

  // isDuringEvent: 曜日・時刻ごとの状態を検証
  describe("isDuringEvent", () => {
    const stateCases = [
      // 月曜日（イベント日）
      {
        date: "2026-03-30T00:00:00",
        label: "3/30(月) 0:00  イベント前",
        expected: false,
      },
      {
        date: "2026-03-30T12:00:00",
        label: "3/30(月) 12:00 イベント前",
        expected: false,
      },
      {
        date: "2026-03-30T20:59:00",
        label: "3/30(月) 20:59 イベント直前",
        expected: false,
      },
      {
        date: "2026-03-30T21:00:00",
        label: "3/30(月) 21:00 イベント開始",
        expected: true,
      },
      {
        date: "2026-03-30T22:30:00",
        label: "3/30(月) 22:30 イベント中",
        expected: true,
      },
      {
        date: "2026-03-30T23:59:00",
        label: "3/30(月) 23:59 イベント終了直前",
        expected: true,
      },
      {
        date: "2026-03-31T00:00:00",
        label: "3/31(月) 0:00 イベント終了後",
        expected: false,
      },
      // 火曜〜日曜（イベント後）
      { date: "2026-03-31T12:00:00", label: "3/31(火) 12:00", expected: false },
      { date: "2026-04-01T12:00:00", label: "4/1(水) 12:00", expected: false },
      { date: "2026-04-02T12:00:00", label: "4/2(木) 12:00", expected: false },
      { date: "2026-04-03T12:00:00", label: "4/3(金) 12:00", expected: false },
      { date: "2026-04-04T12:00:00", label: "4/4(土) 12:00", expected: false },
      { date: "2026-04-05T12:00:00", label: "4/5(日) 12:00", expected: false },
    ];

    it.each(stateCases)("$label → $expected", ({ date, expected }) => {
      expect(isDuringEvent(new Date(date), config)).toBe(expected);
    });
  });

  // getNextEventWeekId: 各日付から見た「次のイベント週」を検証
  describe("getNextEventWeekId", () => {
    const nextEventCases = [
      // 月曜（イベント前・イベント中）→ 今週 W14
      {
        date: "2026-03-30T12:00:00",
        label: "3/30(月) 12:00 イベント前",
        expected: "2026-W14",
      },
      {
        date: "2026-03-30T22:30:00",
        label: "3/30(月) 22:30 イベント中",
        expected: "2026-W14",
      },
      // 火曜〜日曜（イベント後）→ 来週 W15
      {
        date: "2026-03-31T12:00:00",
        label: "3/31(火) イベント終了後",
        expected: "2026-W15",
      },
      { date: "2026-04-01T12:00:00", label: "4/1(水)", expected: "2026-W15" },
      { date: "2026-04-02T12:00:00", label: "4/2(木)", expected: "2026-W15" },
      { date: "2026-04-03T12:00:00", label: "4/3(金)", expected: "2026-W15" },
      { date: "2026-04-04T12:00:00", label: "4/4(土)", expected: "2026-W15" },
      {
        date: "2026-04-05T12:00:00",
        label: "4/5(日) 翌月曜を待つ",
        expected: "2026-W15",
      },
    ];

    it.each(nextEventCases)("$label → $expected", ({ date, expected }) => {
      expect(getNextEventWeekId(new Date(date), config)).toBe(expected);
    });
  });

  // getNavigationWeeks: 各状態でのナビゲーションラベルを検証
  describe("getNavigationWeeks", () => {
    const navCases = [
      // イベント前（月曜イベント前）: center=次回(W14)
      {
        date: "2026-03-30T12:00:00",
        label: "3/30(月) 12:00 イベント前",
        prevWeek: "2026-W13",
        centerWeek: "2026-W14",
        nextWeek: "2026-W15",
        centerLabel: "次回" as const,
        rightLabel: "次々回" as const,
      },
      // イベント中（月曜イベント中）: center=今回(W14)
      {
        date: "2026-03-30T22:30:00",
        label: "3/30(月) 22:30 イベント中",
        prevWeek: "2026-W13",
        centerWeek: "2026-W14",
        nextWeek: "2026-W15",
        centerLabel: "今回" as const,
        rightLabel: "次回" as const,
      },
      // イベント後（火曜）: center=次回(W15)
      {
        date: "2026-03-31T12:00:00",
        label: "3/31(火) イベント終了後",
        prevWeek: "2026-W14",
        centerWeek: "2026-W15",
        nextWeek: "2026-W16",
        centerLabel: "次回" as const,
        rightLabel: "次々回" as const,
      },
      // イベント後（金曜）: center=次回(W15)
      {
        date: "2026-04-03T12:00:00",
        label: "4/3(金) 週後半",
        prevWeek: "2026-W14",
        centerWeek: "2026-W15",
        nextWeek: "2026-W16",
        centerLabel: "次回" as const,
        rightLabel: "次々回" as const,
      },
      // イベント後（日曜）: center=次回(W15)
      {
        date: "2026-04-05T12:00:00",
        label: "4/5(日) 翌月曜を待つ",
        prevWeek: "2026-W14",
        centerWeek: "2026-W15",
        nextWeek: "2026-W16",
        centerLabel: "次回" as const,
        rightLabel: "次々回" as const,
      },
    ];

    it.each(navCases)(
      "$label → center=$centerWeek($centerLabel)",
      ({ date, prevWeek, centerWeek, nextWeek, centerLabel, rightLabel }) => {
        const result = getNavigationWeeks(new Date(date), config);
        expect(result.prevWeek).toBe(prevWeek);
        expect(result.centerWeek).toBe(centerWeek);
        expect(result.nextWeek).toBe(nextWeek);
        expect(result.centerLabel).toBe(centerLabel);
        expect(result.rightLabel).toBe(rightLabel);
      },
    );
  });
});
