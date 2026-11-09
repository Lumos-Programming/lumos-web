/**
 * プロフィール編集で「種別」を切り替えたときの所属情報の引き継ぎ（#352）。
 * 画面の state を直接触らない純粋関数にして、コンポーネントから呼ぶ。
 */

import {
  FACULTIES,
  getFacultyOptions,
  type EnrollmentType,
  type MemberType,
} from "@/types/profile";

/** 種別ごとに退避しておく所属情報 */
export type EnrollmentCache = {
  year: string;
  faculty: string;
  admissionYear: string;
  enrollmentType: EnrollmentType | "";
  transferYear: string;
  graduationYear: string;
  currentOrg: string;
  hasUndergrad: boolean | null;
  undergradFaculty: string;
  undergradAdmissionYear: string;
  undergradEnrollmentType: EnrollmentType | "";
  undergradTransferYear: string;
};

export const EMPTY_ENROLLMENT: EnrollmentCache = {
  year: "",
  faculty: "",
  admissionYear: "",
  enrollmentType: "",
  transferYear: "",
  graduationYear: "",
  currentOrg: "",
  hasUndergrad: null,
  undergradFaculty: "",
  undergradAdmissionYear: "",
  undergradEnrollmentType: "",
  undergradTransferYear: "",
};

/**
 * 切り替え先の種別で表示する所属情報を決める。
 * - 同じ画面で一度選んだ種別に戻るときは、そのとき入力していた値（cached）を復元する
 * - 初めて選ぶ種別なら、今の所属がその種別でも選べる限り引き継ぐ
 *   （例: 院生 → 卒業生で、学府・入学年度・学部からの進学情報を残す）
 * - 学部生 → 院生は、今の学部を「学部での所属」に移す
 * 学年は種別ごとに選択肢が違うので引き継がない。
 */
export function enrollmentForMemberType(
  to: MemberType,
  current: EnrollmentCache,
  cached: EnrollmentCache | undefined,
): EnrollmentCache {
  if (cached) return cached;

  const { options } = getFacultyOptions(to);
  if (current.faculty && options.includes(current.faculty)) {
    return { ...current, year: "", currentOrg: "" };
  }

  if (
    to === "院生" &&
    (FACULTIES as readonly string[]).includes(current.faculty)
  ) {
    return {
      ...EMPTY_ENROLLMENT,
      hasUndergrad: true,
      undergradFaculty: current.faculty,
      undergradAdmissionYear: current.admissionYear,
      undergradEnrollmentType: current.enrollmentType,
      undergradTransferYear: current.transferYear,
    };
  }

  return EMPTY_ENROLLMENT;
}
