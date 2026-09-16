import { describe, it, expect } from "vitest";
import {
  HEADER_TEMPLATES,
  ITEM_TEMPLATES,
  hasUnresolvedPlaceholder,
  pickTemplate,
  type TemplateCategory,
} from "./templates";

const CATEGORIES = Object.keys(HEADER_TEMPLATES) as TemplateCategory[];

/** 丁寧語は使わない (issue #273 §11.3)。テンションだけ高くても構造が丁寧だと業務Botになる。 */
const POLITE_PATTERNS = [
  "お願いします",
  "ご確認",
  "してみましょう",
  "しましょう",
  "いかがでしょうか",
  "お時間です",
  "ください",
];

describe("template inventory", () => {
  it("has at least 10 header templates per category", () => {
    for (const category of CATEGORIES) {
      expect(
        HEADER_TEMPLATES[category].length,
        `${category} needs >= 10 templates`,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("never leaves a placeholder in a header template", () => {
    // ヘッダーは複数 Item をまとめる見出しなので {{number}} を含んではいけない
    for (const category of CATEGORIES) {
      for (const text of HEADER_TEMPLATES[category]) {
        expect(hasUnresolvedPlaceholder(text), `${category}: ${text}`).toBe(
          false,
        );
      }
    }
  });

  it("requires {{number}} in every item template", () => {
    for (const [category, list] of Object.entries(ITEM_TEMPLATES)) {
      for (const text of list ?? []) {
        expect(text, `${category}: ${text}`).toContain("{{number}}");
      }
    }
  });

  it("avoids polite business-Slack phrasing", () => {
    const all = [
      ...Object.values(HEADER_TEMPLATES).flat(),
      ...Object.values(ITEM_TEMPLATES).flatMap((v) => v ?? []),
    ];
    for (const text of all) {
      for (const polite of POLITE_PATTERNS) {
        expect(text.includes(polite), `"${text}" contains "${polite}"`).toBe(
          false,
        );
      }
    }
  });

  it("keeps every template short", () => {
    const all = [
      ...Object.values(HEADER_TEMPLATES).flat(),
      ...Object.values(ITEM_TEMPLATES).flatMap((v) => v ?? []),
    ];
    for (const text of all) {
      expect(text.length, `too long: ${text}`).toBeLessThanOrEqual(40);
      expect(text.includes("\n"), `multi-line: ${text}`).toBe(false);
    }
  });

  it("does not contain a raw backslash (Discord treats it as an escape char)", () => {
    const all = [
      ...Object.values(HEADER_TEMPLATES).flat(),
      ...Object.values(ITEM_TEMPLATES).flatMap((v) => v ?? []),
    ];
    for (const text of all) {
      expect(text.includes("\\"), `backslash in: ${text}`).toBe(false);
    }
  });
});

describe("pickTemplate", () => {
  it("is deterministic with an injected rng", () => {
    const first = pickTemplate("review_request", { rng: () => 0 });
    const second = pickTemplate("review_request", { rng: () => 0 });
    expect(first).toEqual(second);
    expect(first.index).toBe(0);
  });

  it("never returns an index out of range when rng returns 1", () => {
    const picked = pickTemplate("pr_merged", { rng: () => 1 });
    expect(picked.index).toBeLessThan(HEADER_TEMPLATES.pr_merged.length);
    expect(picked.text).toBeTruthy();
  });

  it("avoids repeating the previous template", () => {
    const picked = pickTemplate("issue_reminder", {
      rng: () => 0,
      avoidIndex: 0,
    });
    expect(picked.index).not.toBe(0);
  });

  it("excludes {{number}} templates unless a single item number is given", () => {
    // 複数 Item の見出しに「タスク #{{number}}」を使うと嘘になる
    for (let i = 0; i < 40; i++) {
      const picked = pickTemplate("issue_reminder", { rng: () => i / 40 });
      expect(hasUnresolvedPlaceholder(picked.text)).toBe(false);
    }
  });

  it("interpolates the item number when one is supplied", () => {
    const pool = HEADER_TEMPLATES.review_request.length;
    // ITEM_TEMPLATES 側に当たるよう、後半のインデックスを狙う
    const picked = pickTemplate("review_request", {
      rng: () =>
        (pool + 0.5) / (pool + (ITEM_TEMPLATES.review_request?.length ?? 0)),
      itemNumber: 123,
    });
    expect(hasUnresolvedPlaceholder(picked.text)).toBe(false);
    if (picked.index >= pool) expect(picked.text).toContain("123");
  });
});
