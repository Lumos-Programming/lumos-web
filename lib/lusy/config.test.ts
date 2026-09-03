import { describe, it, expect } from "vitest";
import { isDoneStatus, isTargetRepo } from "./config";

describe("isDoneStatus", () => {
  const done = ["Done", "完了"];

  it("matches regardless of case and surrounding space", () => {
    expect(isDoneStatus(" done ", done)).toBe(true);
    expect(isDoneStatus("完了", done)).toBe(true);
  });

  it("does not match an in-progress status", () => {
    expect(isDoneStatus("In Progress", done)).toBe(false);
  });

  it("treats a missing status as not done", () => {
    // Project に載っていない Item は Status が null になるが、未完了として扱う
    expect(isDoneStatus(null, done)).toBe(false);
  });
});

describe("isTargetRepo", () => {
  it("allows every repository when no filter is configured", () => {
    expect(isTargetRepo("anything", [])).toBe(true);
  });

  it("filters case-insensitively", () => {
    expect(isTargetRepo("LumosWeb", ["lumosweb", "discordbot"])).toBe(true);
    expect(isTargetRepo("other-repo", ["lumosweb"])).toBe(false);
  });
});
