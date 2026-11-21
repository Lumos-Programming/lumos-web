import { describe, expect, it } from "vitest";
import {
  drawDeadline,
  drawIdFor,
  latestClosedDrawId,
} from "./lottery-schedule";

const jst = (local: string) => new Date(`${local}+09:00`);

describe("drawIdFor", () => {
  it.each([
    ["Monday", "2026-11-09T10:00:00", "2026-11-13"],
    ["Thursday 23:59 JST (UTC Thursday)", "2026-11-12T23:59:00", "2026-11-13"],
    [
      "Friday 00:30 JST (still Thursday in UTC)",
      "2026-11-13T00:30:00",
      "2026-11-13",
    ],
    ["Friday 16:59:59.999", "2026-11-13T16:59:59.999", "2026-11-13"],
    ["exactly at the deadline", "2026-11-13T17:00:00", "2026-11-20"],
    ["Friday after the deadline", "2026-11-13T17:01:00", "2026-11-20"],
    ["Saturday", "2026-11-14T09:00:00", "2026-11-20"],
    ["Sunday", "2026-11-15T23:00:00", "2026-11-20"],
    ["across the year", "2026-12-31T12:00:00", "2027-01-01"],
    ["after the year-end deadline", "2027-01-01T18:00:00", "2027-01-08"],
  ])("%s", (_name, local, expected) => {
    expect(drawIdFor(jst(local))).toBe(expected);
  });

  it("always returns a Friday whose deadline is in the future", () => {
    let t = jst("2026-11-01T00:00:00").getTime();
    for (let i = 0; i < 24 * 14; i++, t += 60 * 60 * 1000) {
      const at = new Date(t);
      const id = drawIdFor(at);
      expect(new Date(`${id}T12:00:00+09:00`).getUTCDay()).toBe(5);
      const deadline = drawDeadline(id).getTime();
      expect(deadline).toBeGreaterThan(t);
      expect(deadline - t).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
    }
  });
});

describe("latestClosedDrawId", () => {
  it.each([
    ["Friday 17:30 (cron time)", "2026-11-13T17:30:00", "2026-11-13"],
    ["exactly at the deadline", "2026-11-13T17:00:00", "2026-11-13"],
    ["Friday before the deadline", "2026-11-13T16:00:00", "2026-11-06"],
    ["Monday", "2026-11-09T10:00:00", "2026-11-06"],
  ])("%s", (_name, local, expected) => {
    expect(latestClosedDrawId(jst(local))).toBe(expected);
  });
});
