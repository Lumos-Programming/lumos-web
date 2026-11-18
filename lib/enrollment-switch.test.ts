import { describe, expect, it } from "vitest";
import {
  EMPTY_ENROLLMENT,
  enrollmentForMemberType,
  type EnrollmentCache,
} from "./enrollment-switch";

/** #352 の再現手順にある院生のプロフィール */
const GRAD: EnrollmentCache = {
  ...EMPTY_ENROLLMENT,
  year: "修士1年",
  faculty: "環境情報学府",
  admissionYear: "2025",
  enrollmentType: "入学",
  hasUndergrad: true,
  undergradFaculty: "理工学部",
  undergradAdmissionYear: "2021",
  undergradEnrollmentType: "入学",
};

const UNDERGRAD: EnrollmentCache = {
  ...EMPTY_ENROLLMENT,
  year: "学部4年",
  faculty: "理工学部",
  admissionYear: "2022",
  enrollmentType: "編入",
  transferYear: "2024",
};

describe("enrollmentForMemberType", () => {
  it("院生 → 卒業生: 学府・入学年度・学部からの進学情報を引き継ぐ", () => {
    const next = enrollmentForMemberType("卒業生", GRAD, undefined);
    expect(next).toEqual({ ...GRAD, year: "", currentOrg: "" });
  });

  it("学部生 → 卒業生: 学部・入学年度・編入情報を引き継ぐ", () => {
    const next = enrollmentForMemberType("卒業生", UNDERGRAD, undefined);
    expect(next.faculty).toBe("理工学部");
    expect(next.admissionYear).toBe("2022");
    expect(next.enrollmentType).toBe("編入");
    expect(next.transferYear).toBe("2024");
    expect(next.year).toBe("");
  });

  it("学部生 → 院生: 今の学部を「学部での所属」に移し、学府は未選択にする", () => {
    const next = enrollmentForMemberType("院生", UNDERGRAD, undefined);
    expect(next).toEqual({
      ...EMPTY_ENROLLMENT,
      hasUndergrad: true,
      undergradFaculty: "理工学部",
      undergradAdmissionYear: "2022",
      undergradEnrollmentType: "編入",
      undergradTransferYear: "2024",
    });
  });

  it("院生 → 学部生: 学府は学部生では選べないので空にする", () => {
    expect(enrollmentForMemberType("学部生", GRAD, undefined)).toEqual(
      EMPTY_ENROLLMENT,
    );
  });

  it("院生 → その他: 学府はその他でも選べるので引き継ぐ", () => {
    const next = enrollmentForMemberType("その他", GRAD, undefined);
    expect(next.faculty).toBe("環境情報学府");
    expect(next.undergradFaculty).toBe("理工学部");
  });

  it("一度選んだ種別に戻るときは、そのとき入力していた値を優先する", () => {
    const cached: EnrollmentCache = { ...GRAD, faculty: "理工学府" };
    expect(enrollmentForMemberType("院生", UNDERGRAD, cached)).toBe(cached);
  });

  it("卒業生の勤務先・所属先は他の種別から持ち込まない", () => {
    const next = enrollmentForMemberType(
      "卒業生",
      { ...GRAD, currentOrg: "なにか" },
      undefined,
    );
    expect(next.currentOrg).toBe("");
  });

  it("所属が未入力なら空のまま", () => {
    expect(
      enrollmentForMemberType("卒業生", EMPTY_ENROLLMENT, undefined),
    ).toEqual(EMPTY_ENROLLMENT);
  });

  it("切り替えのたびに新しいオブジェクトを返し、元の値を書き換えない", () => {
    const before = structuredClone(GRAD);
    enrollmentForMemberType("卒業生", GRAD, undefined);
    expect(GRAD).toEqual(before);
  });
});
