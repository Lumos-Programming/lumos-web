import { beforeEach, describe, expect, it } from "vitest";
import * as firebaseAdmin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  countReasons,
  displayName,
  listOptoutSurveys,
  type OptoutSurveyRow,
} from "./optout-survey-report";
import { OPTOUT_REASON_OPTIONS } from "@/types/optout";

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
  });
}

function row(over: Partial<OptoutSurveyRow>): OptoutSurveyRow {
  return {
    discordId: "1",
    name: "a",
    reason: "busy",
    reasonLabel: "",
    answeredAt: null,
    confirmed: false,
    ...over,
  };
}

describe("displayName", () => {
  it("氏名 → ニックネーム → Discord 名 → ID の順に使う", () => {
    expect(
      displayName("9", { lastName: "横浜", firstName: "太郎", nickname: "n" }),
    ).toBe("横浜 太郎");
    expect(displayName("9", { nickname: "n", discordUsername: "d" })).toBe("n");
    expect(displayName("9", { discordUsername: "d" })).toBe("d");
    expect(displayName("9", undefined)).toBe("9");
  });

  it("姓だけでも使う", () => {
    expect(displayName("9", { lastName: "横浜" })).toBe("横浜");
  });
});

describe("countReasons", () => {
  it("全選択肢を選択肢の順に並べ、0 件も含める", () => {
    const counts = countReasons([]);
    expect(counts.map((c) => c.reason)).toEqual(
      OPTOUT_REASON_OPTIONS.map((o) => o.value),
    );
    expect(counts.every((c) => c.confirmed === 0 && c.unconfirmed === 0)).toBe(
      true,
    );
  });

  it("退会確定と未確定を分けて数える", () => {
    const counts = countReasons([
      row({ reason: "busy", confirmed: true }),
      row({ reason: "busy", confirmed: true }),
      row({ reason: "busy", confirmed: false }),
      row({ reason: "atmosphere", confirmed: true }),
    ]);
    expect(counts.find((c) => c.reason === "busy")).toMatchObject({
      confirmed: 2,
      unconfirmed: 1,
    });
    expect(counts.find((c) => c.reason === "atmosphere")).toMatchObject({
      confirmed: 1,
      unconfirmed: 0,
    });
  });

  it("選択肢に無い古い値は末尾に、値そのままの表示名で足す", () => {
    const counts = countReasons([row({ reason: "legacy", confirmed: true })]);
    expect(counts.at(-1)).toEqual({
      reason: "legacy",
      label: "legacy",
      confirmed: 1,
      unconfirmed: 0,
    });
  });
});

describe("listOptoutSurveys", () => {
  beforeEach(async () => {
    const db = firebaseAdmin.firestore();
    for (const c of await db.listCollections()) {
      for (const d of await c.listDocuments()) await d.delete();
    }
  });

  it("回答が無ければ空", async () => {
    expect(await listOptoutSurveys()).toEqual([]);
  });

  it("メンバー名を付け、新しい順に返す。確認済みかどうかを confirmedAt で判定する", async () => {
    const db = firebaseAdmin.firestore();
    await db
      .collection("members")
      .doc("100")
      .set({ lastName: "横浜", firstName: "太郎" });
    await db
      .collection("survey_optout")
      .doc("100")
      .set({
        discordId: "100",
        reason: "atmosphere",
        reasonDetail: "人間関係",
        createdAt: Timestamp.fromMillis(1_000),
        updatedAt: Timestamp.fromMillis(2_000),
        confirmedAt: Timestamp.fromMillis(3_000),
      });
    // メンバーの doc が無い・自由記述なし・未確定
    await db
      .collection("survey_optout")
      .doc("200")
      .set({
        discordId: "200",
        reason: "busy",
        createdAt: Timestamp.fromMillis(5_000),
      });

    const rows = await listOptoutSurveys();
    expect(rows).toEqual([
      {
        discordId: "200",
        name: "200",
        reason: "busy",
        reasonLabel: "忙しくなった・時間が取れない",
        answeredAt: 5_000,
        confirmed: false,
      },
      {
        discordId: "100",
        name: "横浜 太郎",
        reason: "atmosphere",
        reasonLabel: "活動の雰囲気が合わなかった",
        reasonDetail: "人間関係",
        answeredAt: 2_000,
        confirmed: true,
      },
    ]);
  });
});
