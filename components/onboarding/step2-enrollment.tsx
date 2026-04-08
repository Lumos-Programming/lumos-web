"use client";

import { useRef, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MEMBER_TYPES,
  ENROLLMENT_TYPES,
  ADMISSION_YEARS,
  FACULTIES,
  GRADUATE_SCHOOLS,
  getFacultyOptions,
} from "@/types/profile";
import type { FormData } from "./types";
import { getSchoolYearOptions } from "./types";

interface Step2EnrollmentProps {
  form: FormData;
  setFormStep2: (updater: (f: FormData) => FormData) => void;
  step2Errors: Partial<Record<keyof FormData, string>>;
  setStep2Errors: Dispatch<
    SetStateAction<Partial<Record<keyof FormData, string>>>
  >;
  submitting: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Enrollment({
  form,
  setFormStep2,
  step2Errors,
  setStep2Errors,
  submitting,
  onNext,
  onBack,
}: Step2EnrollmentProps) {
  const composingRef = useRef(false);

  return (
    <div className="p-8">
      <div className="mb-6 animate-[fadeInUp_300ms_ease_both]">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
          所属情報
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          所属する学部・学府や入学情報を入力してください。
        </p>
      </div>

      <div className="space-y-5">
        {/* 種別 */}
        <div className="space-y-1.5 animate-[fadeInUp_300ms_60ms_ease_both]">
          <Label>
            種別 <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2 flex-wrap">
            {MEMBER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFormStep2((f) => ({
                    ...f,
                    memberType: type,
                    schoolYear: "",
                    faculty: "",
                    graduationYear: "",
                    currentOrg: "",
                  }));
                  setStep2Errors((p) => ({
                    ...p,
                    memberType: undefined,
                    faculty: undefined,
                  }));
                }}
                className={[
                  "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                  form.memberType === type
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                ].join(" ")}
              >
                {type}
              </button>
            ))}
          </div>
          {step2Errors.memberType && (
            <p className="text-xs text-red-500">{step2Errors.memberType}</p>
          )}
          {form.memberType && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="studentId">
                {form.memberType === "卒業生"
                  ? "最終所属時の学籍番号"
                  : "学籍番号"}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentId"
                value={form.studentId}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  composingRef.current = false;
                  setFormStep2((f) => ({
                    ...f,
                    studentId: e.currentTarget.value.toUpperCase(),
                  }));
                }}
                onChange={(e) => {
                  if (composingRef.current) {
                    setFormStep2((f) => ({
                      ...f,
                      studentId: e.target.value,
                    }));
                  } else {
                    setFormStep2((f) => ({
                      ...f,
                      studentId: e.target.value.toUpperCase(),
                    }));
                  }
                  if (step2Errors.studentId)
                    setStep2Errors((p) => ({ ...p, studentId: undefined }));
                }}
                placeholder="2164078 / 24HJ078"
                className={step2Errors.studentId ? "border-red-400" : ""}
              />
              {step2Errors.studentId && (
                <p className="text-xs text-red-500">{step2Errors.studentId}</p>
              )}
            </div>
          )}
          {form.memberType === "その他" && (
            <div className="mt-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/30 px-4 py-3 text-sm text-teal-800 dark:text-teal-300">
              研究生・科目等履修生・聴講生などが該当します。
            </div>
          )}
        </div>

        {/* 学年 */}
        {form.memberType &&
          form.memberType !== "卒業生" &&
          (() => {
            const { label, note, options } = getSchoolYearOptions(
              form.memberType,
            );
            return (
              <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
                <Label htmlFor="schoolYear">
                  {new Date().getFullYear()}年度での{label}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                {note && (
                  <p className="text-xs text-muted-foreground">{note}</p>
                )}
                <select
                  id="schoolYear"
                  value={form.schoolYear}
                  onChange={(e) => {
                    setFormStep2((f) => ({ ...f, schoolYear: e.target.value }));
                    if (step2Errors.schoolYear)
                      setStep2Errors((p) => ({ ...p, schoolYear: undefined }));
                  }}
                  className={[
                    "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                    step2Errors.schoolYear
                      ? "border-red-400"
                      : "border-input dark:border-gray-700",
                  ].join(" ")}
                >
                  <option value="">選択してください</option>
                  {options.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {step2Errors.schoolYear && (
                  <p className="text-xs text-red-500">
                    {step2Errors.schoolYear}
                  </p>
                )}
              </div>
            );
          })()}

        {/* 学部/学府 */}
        {form.memberType &&
          (() => {
            const { label, options } = getFacultyOptions(form.memberType);
            return (
              <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
                <Label htmlFor="faculty">
                  {label} <span className="text-red-500">*</span>
                </Label>
                <select
                  id="faculty"
                  value={form.faculty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormStep2((f) => {
                      const updated = { ...f, faculty: val };
                      // 卒業生が学部を選んだ場合、学部在籍情報をリセット
                      if (
                        f.memberType === "卒業生" &&
                        !(GRADUATE_SCHOOLS as readonly string[]).includes(val)
                      ) {
                        updated.hasUndergrad = null;
                        updated.undergradFaculty = "";
                        updated.undergradAdmissionYear = "";
                        updated.undergradEnrollmentType = "";
                        updated.undergradTransferYear = "";
                      }
                      return updated;
                    });
                    if (step2Errors.faculty)
                      setStep2Errors((p) => ({ ...p, faculty: undefined }));
                  }}
                  className={[
                    "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                    step2Errors.faculty
                      ? "border-red-400"
                      : "border-input dark:border-gray-700",
                  ].join(" ")}
                >
                  <option value="">選択してください</option>
                  {options.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                {step2Errors.faculty && (
                  <p className="text-xs text-red-500">{step2Errors.faculty}</p>
                )}
              </div>
            );
          })()}

        {/* 入学年度 + 入学/編入 */}
        <div className="space-y-1.5 animate-[fadeInUp_300ms_120ms_ease_both]">
          <Label>
            {form.memberType === "院生"
              ? "横浜国立大学大学院への入学年度"
              : "横浜国立大学への入学年度"}
            <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <select
              value={form.admissionYear}
              onChange={(e) => {
                setFormStep2((f) => ({ ...f, admissionYear: e.target.value }));
                if (step2Errors.admissionYear)
                  setStep2Errors((p) => ({
                    ...p,
                    admissionYear: undefined,
                  }));
              }}
              className={[
                "flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                step2Errors.admissionYear
                  ? "border-red-400"
                  : "border-input dark:border-gray-700",
              ].join(" ")}
            >
              <option value="">年度を選択</option>
              {ADMISSION_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年度
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {ENROLLMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setFormStep2((f) => ({
                      ...f,
                      enrollmentType: type,
                      transferYear: type === "編入" ? "3" : "",
                    }))
                  }
                  className={[
                    "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                    form.enrollmentType === type
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                  ].join(" ")}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          {step2Errors.admissionYear && (
            <p className="text-xs text-red-500">{step2Errors.admissionYear}</p>
          )}
        </div>

        {/* 編入年次 */}
        {form.enrollmentType === "編入" && (
          <div className="flex items-center gap-3 animate-[fadeInUp_300ms_ease_both]">
            <Label className="whitespace-nowrap text-sm">編入年次</Label>
            <div className="flex gap-2">
              {["2", "3", "4"].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() =>
                    setFormStep2((f) => ({ ...f, transferYear: y }))
                  }
                  className={[
                    "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                    form.transferYear === y
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                  ].join(" ")}
                >
                  {y}年
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 卒業生のみ：卒業年度 */}
        {form.memberType === "卒業生" && (
          <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
            <Label>
              卒業年度 <span className="text-red-500">*</span>
            </Label>
            <select
              value={form.graduationYear}
              onChange={(e) => {
                setFormStep2((f) => ({ ...f, graduationYear: e.target.value }));
                if (step2Errors.graduationYear)
                  setStep2Errors((p) => ({ ...p, graduationYear: undefined }));
              }}
              className={[
                "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                step2Errors.graduationYear
                  ? "border-red-400"
                  : "border-input dark:border-gray-700",
              ].join(" ")}
            >
              <option value="">年度を選択</option>
              {ADMISSION_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年度
                </option>
              ))}
            </select>
            {step2Errors.graduationYear && (
              <p className="text-xs text-red-500">
                {step2Errors.graduationYear}
              </p>
            )}
          </div>
        )}

        {/* 院生のみ：学部進学確認 + 学部時代の情報 */}
        {form.memberType === "院生" && (
          <div className="space-y-4 animate-[fadeInUp_300ms_ease_both] border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
            <div className="space-y-1.5">
              <Label>学部から進学しましたか？</Label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() =>
                      setFormStep2((f) => ({
                        ...f,
                        hasUndergrad: val,
                        undergradFaculty: val ? f.undergradFaculty : "",
                        undergradAdmissionYear: val
                          ? f.undergradAdmissionYear
                          : "",
                        undergradEnrollmentType: val
                          ? f.undergradEnrollmentType
                          : "",
                        undergradTransferYear: val
                          ? f.undergradTransferYear
                          : "",
                      }))
                    }
                    className={[
                      "px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                      form.hasUndergrad === val
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                    ].join(" ")}
                  >
                    {val ? "はい" : "いいえ"}
                  </button>
                ))}
              </div>
            </div>

            {form.hasUndergrad === true && (
              <div className="space-y-4 animate-[fadeInUp_300ms_ease_both]">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  学部での所属
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="undergradFaculty">所属学部</Label>
                  <select
                    id="undergradFaculty"
                    value={form.undergradFaculty}
                    onChange={(e) => {
                      setFormStep2((f) => ({
                        ...f,
                        undergradFaculty: e.target.value,
                      }));
                      if (step2Errors.undergradFaculty)
                        setStep2Errors((p) => ({
                          ...p,
                          undergradFaculty: undefined,
                        }));
                    }}
                    className={[
                      "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                      step2Errors.undergradFaculty
                        ? "border-red-400"
                        : "border-input dark:border-gray-700",
                    ].join(" ")}
                  >
                    <option value="">選択してください</option>
                    {FACULTIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  {step2Errors.undergradFaculty && (
                    <p className="text-xs text-red-500">
                      {step2Errors.undergradFaculty}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>学部への入学年度</Label>
                  <div className="flex gap-2">
                    <select
                      value={form.undergradAdmissionYear}
                      onChange={(e) => {
                        setFormStep2((f) => ({
                          ...f,
                          undergradAdmissionYear: e.target.value,
                        }));
                        if (step2Errors.undergradAdmissionYear)
                          setStep2Errors((p) => ({
                            ...p,
                            undergradAdmissionYear: undefined,
                          }));
                      }}
                      className={[
                        "flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                        step2Errors.undergradAdmissionYear
                          ? "border-red-400"
                          : "border-input dark:border-gray-700",
                      ].join(" ")}
                    >
                      <option value="">年度を選択</option>
                      {ADMISSION_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}年度
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {ENROLLMENT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormStep2((f) => ({
                              ...f,
                              undergradEnrollmentType: type,
                              undergradTransferYear: type === "編入" ? "3" : "",
                            }))
                          }
                          className={[
                            "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                            form.undergradEnrollmentType === type
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                          ].join(" ")}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  {step2Errors.undergradAdmissionYear && (
                    <p className="text-xs text-red-500">
                      {step2Errors.undergradAdmissionYear}
                    </p>
                  )}
                </div>

                {form.undergradEnrollmentType === "編入" && (
                  <div className="flex items-center gap-3 animate-[fadeInUp_300ms_ease_both]">
                    <Label className="whitespace-nowrap text-sm">
                      編入年次
                    </Label>
                    <div className="flex gap-2">
                      {["2", "3", "4"].map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() =>
                            setFormStep2((f) => ({
                              ...f,
                              undergradTransferYear: y,
                            }))
                          }
                          className={[
                            "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                            form.undergradTransferYear === y
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                          ].join(" ")}
                        >
                          {y}年
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 卒業生かつ学府卒の場合のみ：学部在籍確認 + 学部時代の情報 */}
        {form.memberType === "卒業生" &&
          (GRADUATE_SCHOOLS as readonly string[]).includes(form.faculty) && (
            <div className="space-y-4 animate-[fadeInUp_300ms_ease_both] border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
              <div className="space-y-1.5">
                <Label>学部に在籍しましたか？</Label>
                <div className="flex gap-2">
                  {([true, false] as const).map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() =>
                        setFormStep2((f) => ({
                          ...f,
                          hasUndergrad: val,
                          undergradFaculty: val ? f.undergradFaculty : "",
                          undergradAdmissionYear: val
                            ? f.undergradAdmissionYear
                            : "",
                          undergradEnrollmentType: val
                            ? f.undergradEnrollmentType
                            : "",
                          undergradTransferYear: val
                            ? f.undergradTransferYear
                            : "",
                        }))
                      }
                      className={[
                        "px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                        form.hasUndergrad === val
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                      ].join(" ")}
                    >
                      {val ? "はい" : "いいえ"}
                    </button>
                  ))}
                </div>
              </div>

              {form.hasUndergrad === true && (
                <div className="space-y-4 animate-[fadeInUp_300ms_ease_both]">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    学部での所属
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="undergradFacultyGrad">所属学部</Label>
                    <select
                      id="undergradFacultyGrad"
                      value={form.undergradFaculty}
                      onChange={(e) => {
                        setFormStep2((f) => ({
                          ...f,
                          undergradFaculty: e.target.value,
                        }));
                        if (step2Errors.undergradFaculty)
                          setStep2Errors((p) => ({
                            ...p,
                            undergradFaculty: undefined,
                          }));
                      }}
                      className={[
                        "block w-full border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                        step2Errors.undergradFaculty
                          ? "border-red-400"
                          : "border-input dark:border-gray-700",
                      ].join(" ")}
                    >
                      <option value="">選択してください</option>
                      {FACULTIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                    {step2Errors.undergradFaculty && (
                      <p className="text-xs text-red-500">
                        {step2Errors.undergradFaculty}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>学部への入学年度</Label>
                    <div className="flex gap-2">
                      <select
                        value={form.undergradAdmissionYear}
                        onChange={(e) => {
                          setFormStep2((f) => ({
                            ...f,
                            undergradAdmissionYear: e.target.value,
                          }));
                          if (step2Errors.undergradAdmissionYear)
                            setStep2Errors((p) => ({
                              ...p,
                              undergradAdmissionYear: undefined,
                            }));
                        }}
                        className={[
                          "flex-1 border rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-gray-800 dark:text-gray-100",
                          step2Errors.undergradAdmissionYear
                            ? "border-red-400"
                            : "border-input dark:border-gray-700",
                        ].join(" ")}
                      >
                        <option value="">年度を選択</option>
                        {ADMISSION_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}年度
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        {ENROLLMENT_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              setFormStep2((f) => ({
                                ...f,
                                undergradEnrollmentType: type,
                                undergradTransferYear:
                                  type === "編入" ? "3" : "",
                              }))
                            }
                            className={[
                              "px-4 py-2 rounded-md text-sm font-medium border transition-all duration-200",
                              form.undergradEnrollmentType === type
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                            ].join(" ")}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    {step2Errors.undergradAdmissionYear && (
                      <p className="text-xs text-red-500">
                        {step2Errors.undergradAdmissionYear}
                      </p>
                    )}
                  </div>

                  {form.undergradEnrollmentType === "編入" && (
                    <div className="flex items-center gap-3 animate-[fadeInUp_300ms_ease_both]">
                      <Label className="whitespace-nowrap text-sm">
                        編入年次
                      </Label>
                      <div className="flex gap-2">
                        {["2", "3", "4"].map((y) => (
                          <button
                            key={y}
                            type="button"
                            onClick={() =>
                              setFormStep2((f) => ({
                                ...f,
                                undergradTransferYear: y,
                              }))
                            }
                            className={[
                              "w-12 py-1.5 rounded-full text-sm font-medium border transition-all duration-200",
                              form.undergradTransferYear === y
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400",
                            ].join(" ")}
                          >
                            {y}年
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* 卒業生のみ：現在の所属 */}
        {form.memberType === "卒業生" && (
          <div className="space-y-1.5 animate-[fadeInUp_300ms_ease_both]">
            <Label htmlFor="currentOrg">現在の所属</Label>
            <Input
              id="currentOrg"
              value={form.currentOrg}
              onChange={(e) =>
                setFormStep2((f) => ({ ...f, currentOrg: e.target.value }))
              }
              placeholder="例：株式会社〇〇"
            />
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between animate-[fadeInUp_300ms_200ms_ease_both]">
        <Button variant="ghost" onClick={onBack}>
          ← 戻る
        </Button>
        <Button
          onClick={onNext}
          disabled={submitting}
          className="px-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30"
        >
          {submitting ? "保存中..." : "次へ →"}
        </Button>
      </div>
    </div>
  );
}
