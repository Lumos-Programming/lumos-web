import type {
  MemberType,
  EnrollmentType,
  VisibilityLevel,
} from "@/types/profile";

export interface FormData {
  // Step 1
  lastName: string;
  firstName: string;
  lastNameRomaji: string;
  firstNameRomaji: string;
  studentId: string;
  birthDate: string;
  gender: string;
  nickname: string;
  // Step 2
  memberType: MemberType | "";
  schoolYear: string; // 今年の学年
  faculty: string; // 現在の所属（学府 or 学部）
  admissionYear: string;
  enrollmentType: EnrollmentType | "";
  transferYear: string;
  // 院生のみ：学部時代の情報
  graduationYear: string; // 卒業年度（卒業生のみ）
  hasUndergrad: boolean | null; // null=未選択
  undergradFaculty: string;
  undergradAdmissionYear: string;
  undergradEnrollmentType: EnrollmentType | "";
  undergradTransferYear: string;
  currentOrg: string; // 卒業生のみ
  // Step 4 (興味分野)
  interests: string[];
  topInterests: string[];
  // Step 5 (プロフィール文)
  bio: string;
}

export interface VisibilityForm {
  lastName: VisibilityLevel;
  firstName: VisibilityLevel;
  faculty: VisibilityLevel;
  currentOrg: VisibilityLevel;
  birthDate: VisibilityLevel;
  gender: VisibilityLevel;
  nickname: VisibilityLevel;
  bio: VisibilityLevel;
  github: VisibilityLevel;
  x: VisibilityLevel;
  linkedin: VisibilityLevel;
  line: VisibilityLevel;
  discord: VisibilityLevel;
}

export const DEFAULT_FORM: FormData = {
  lastName: "",
  firstName: "",
  lastNameRomaji: "",
  firstNameRomaji: "",
  studentId: "",
  birthDate: "",
  gender: "",
  nickname: "",
  memberType: "",
  schoolYear: "",
  faculty: "",
  admissionYear: "",
  enrollmentType: "",
  transferYear: "",
  graduationYear: "",
  hasUndergrad: null,
  undergradFaculty: "",
  undergradAdmissionYear: "",
  undergradEnrollmentType: "",
  undergradTransferYear: "",
  currentOrg: "",
  interests: [],
  topInterests: [],
  bio: "",
};

export const DEFAULT_VISIBILITY: VisibilityForm = {
  lastName: "public",
  firstName: "public",
  faculty: "public",
  currentOrg: "public",
  birthDate: "internal",
  gender: "internal",
  nickname: "public",
  bio: "public",
  github: "public",
  x: "public",
  linkedin: "public",
  line: "internal",
  discord: "public",
};

export const VISIBILITY_LABELS: Record<keyof VisibilityForm, string> = {
  lastName: "姓・名",
  firstName: "名",
  faculty: "学部/学府",
  currentOrg: "現在の所属",
  birthDate: "誕生日",
  gender: "性別",
  nickname: "ニックネーム",
  bio: "プロフィール文",
  github: "GitHub",
  x: "X",
  linkedin: "LinkedIn",
  line: "LINE",
  discord: "Discord",
};

export const VISIBILITY_DISPLAY_KEYS: Array<keyof VisibilityForm> = [
  "lastName",
  "faculty",
  "currentOrg",
  "birthDate",
  "gender",
  "nickname",
  "bio",
  "discord",
  "line",
  "github",
  "x",
  "linkedin",
];

export function getSchoolYearOptions(
  memberType: MemberType | "",
): { label: string; note?: string } & { options: string[] } {
  switch (memberType) {
    case "学部生":
      return {
        label: "学年",
        options: ["学部1年", "学部2年", "学部3年", "学部4年"],
      };
    case "院生":
      return {
        label: "学年",
        options: ["修士1年", "修士2年", "博士1年", "博士2年", "博士3年"],
      };
    case "その他":
      return {
        label: "在籍年数",
        note: "在籍した年数を選択してください",
        options: ["1年目", "2年目", "3年目", "4年目", "5年目", "6年目"],
      };
    default:
      return { label: "学年", options: [] };
  }
}

export const FIELD_WEIGHTS: Partial<
  Record<
    keyof FormData | "line" | "github" | "x" | "visibility" | "faceImage",
    number
  >
> = {
  lastName: 8,
  firstName: 8,
  studentId: 8,
  birthDate: 4,
  memberType: 8,
  faculty: 8,
  admissionYear: 4,
  enrollmentType: 4,
  nickname: 4,
  interests: 6,
  bio: 12,
  line: 8,
  github: 4,
  x: 4,
  visibility: 8,
  faceImage: 10,
};

export const STEP_LABELS_BASE = [
  "基本情報",
  "所属情報",
  "SNS連携",
  "プロフィール",
  "公開設定",
  "顔写真",
];
export const STEP_LABELS_WITH_AVATAR = [...STEP_LABELS_BASE, "HP画像"];

export function LineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.731-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={10} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}
