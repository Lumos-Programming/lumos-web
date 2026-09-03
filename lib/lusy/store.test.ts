import { describe, it, expect } from "vitest";
import { isCooldownActive } from "./store";

const DAY = 24 * 60 * 60;
const NOW = 1_800_000_000;

describe("isCooldownActive", () => {
  it("allows the very first run", () => {
    expect(isCooldownActive({}, 3, NOW).active).toBe(false);
  });

  it("blocks a run inside the interval and reports the remaining time", () => {
    const result = isCooldownActive({ lastSuccessfulRunAt: NOW - DAY }, 3, NOW);
    expect(result.active).toBe(true);
    expect(result.retryAfterSeconds).toBe(2 * DAY);
  });

  it("allows a run once the interval has elapsed", () => {
    expect(
      isCooldownActive({ lastSuccessfulRunAt: NOW - 3 * DAY }, 3, NOW).active,
    ).toBe(false);
  });

  it("respects a configured interval other than the default", () => {
    expect(
      isCooldownActive({ lastSuccessfulRunAt: NOW - 3 * DAY }, 7, NOW).active,
    ).toBe(true);
  });

  it("lets a failed run retry the next day rather than waiting a full interval", () => {
    // 失敗時は lastSuccessfulRunAt を更新しないので、翌日の Scheduler で再試行される
    const failedThenNextDay = isCooldownActive(
      { lastSuccessfulRunAt: NOW - 4 * DAY },
      3,
      NOW,
    );
    expect(failedThenNextDay.active).toBe(false);
  });
});
