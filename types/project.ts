export const PROJECT_PUBLICATION_STATUSES = [
  "draft",
  "pending",
  "published",
  "hidden_by_creator",
  "hidden_by_admin",
] as const;
export type ProjectPublicationStatus =
  (typeof PROJECT_PUBLICATION_STATUSES)[number];

export const PROJECT_ACTIVITY_STATUSES = [
  "planned",
  "active",
  "completed",
] as const;
export type ProjectActivityStatus = (typeof PROJECT_ACTIVITY_STATUSES)[number];

export interface ProjectActor {
  id: string;
  isAdmin: boolean;
}

export interface Project {
  id: string;
  authorId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  activityStatus?: ProjectActivityStatus;
  completionDate?: string;
  publicationStatus: ProjectPublicationStatus;
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  approvedBy?: string;
}

export interface ProjectDocument {
  authorId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  activityStatus?: ProjectActivityStatus;
  completionDate?: string;
  publicationStatus: ProjectPublicationStatus;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  submittedAt?: FirebaseFirestore.Timestamp;
  publishedAt?: FirebaseFirestore.Timestamp;
  approvedBy?: string;
}

export const PROJECT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  NAME_REQUIRED: "NAME_REQUIRED",
  NAME_TOO_LONG: "NAME_TOO_LONG",
  DESCRIPTION_REQUIRED: "DESCRIPTION_REQUIRED",
  DESCRIPTION_TOO_LONG: "DESCRIPTION_TOO_LONG",
  TOO_MANY_TAGS: "TOO_MANY_TAGS",
  TAG_TOO_LONG: "TAG_TOO_LONG",
  INVALID_ACTIVITY_STATUS: "INVALID_ACTIVITY_STATUS",
  COMPLETION_DATE_REQUIRED: "COMPLETION_DATE_REQUIRED",
  INVALID_COMPLETION_DATE: "INVALID_COMPLETION_DATE",
  INVALID_IMAGE_URL: "INVALID_IMAGE_URL",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ONBOARDING_REQUIRED: "ONBOARDING_REQUIRED",
  OPTED_OUT: "OPTED_OUT",
  FORBIDDEN: "FORBIDDEN",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  NOT_FOUND: "NOT_FOUND",
} as const;
export type ProjectErrorCode =
  (typeof PROJECT_ERROR_CODES)[keyof typeof PROJECT_ERROR_CODES];

export const PROJECT_ERROR_RESPONSES: Record<
  ProjectErrorCode,
  { status: number; message: string }
> = {
  INVALID_INPUT: { status: 400, message: "入力の形式が正しくありません" },
  NAME_REQUIRED: { status: 400, message: "プロジェクト名を入力してください" },
  NAME_TOO_LONG: {
    status: 400,
    message: "プロジェクト名は80文字以内で入力してください",
  },
  DESCRIPTION_REQUIRED: { status: 400, message: "説明を入力してください" },
  DESCRIPTION_TOO_LONG: {
    status: 400,
    message: "説明は500文字以内で入力してください",
  },
  TOO_MANY_TAGS: { status: 400, message: "タグは10件以内にしてください" },
  TAG_TOO_LONG: { status: 400, message: "タグは30文字以内にしてください" },
  INVALID_ACTIVITY_STATUS: {
    status: 400,
    message: "活動状態の指定が不正です",
  },
  COMPLETION_DATE_REQUIRED: {
    status: 400,
    message: "完了日を入力してください",
  },
  INVALID_COMPLETION_DATE: {
    status: 400,
    message: "完了日はYYYY-MM-DD形式の実在する日付を指定してください",
  },
  INVALID_IMAGE_URL: { status: 400, message: "画像URLの指定が不正です" },
  UNAUTHENTICATED: { status: 401, message: "ログインが必要です" },
  ONBOARDING_REQUIRED: {
    status: 403,
    message: "オンボーディングの完了が必要です",
  },
  OPTED_OUT: { status: 403, message: "退会済みのため操作できません" },
  FORBIDDEN: { status: 403, message: "このプロジェクトを操作できません" },
  ADMIN_REQUIRED: { status: 403, message: "運営権限が必要です" },
  INVALID_TRANSITION: { status: 400, message: "公開状態を変更できません" },
  NOT_FOUND: { status: 404, message: "プロジェクトが見つかりません" },
};

export class ProjectError extends Error {
  readonly code: ProjectErrorCode;

  constructor(code: ProjectErrorCode) {
    super(PROJECT_ERROR_RESPONSES[code].message);
    this.name = "ProjectError";
    this.code = code;
  }
}
