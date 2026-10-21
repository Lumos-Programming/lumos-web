import { describe, expect, it } from "vitest";
import {
  PROJECT_ERROR_CODES,
  ProjectError,
  type ProjectErrorCode,
} from "@/types/project";
import {
  parseProjectDraftInput,
  parseProjectSubmissionInput,
} from "./project-validation";

const validSubmission = {
  name: "Lumos Web",
  description: "Lumosの公式ウェブサイトを開発します。",
  imageUrl: "https://storage.googleapis.com/lumos/projects/lumos.webp",
  tags: ["Next.js", "TypeScript"],
  activityStatus: "active",
};

function expectProjectError(
  operation: () => unknown,
  code: ProjectErrorCode,
): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(ProjectError);
    expect((error as ProjectError).code).toBe(code);
    return;
  }
  throw new Error("Expected a ProjectError");
}

describe("parseProjectDraftInput", () => {
  it("requires only a trimmed project name", () => {
    expect(parseProjectDraftInput({ name: "  Lumos Web  " })).toEqual({
      name: "Lumos Web",
      tags: [],
    });
  });

  it("accepts incomplete optional fields in a draft", () => {
    expect(
      parseProjectDraftInput({
        name: "下書き",
        description: "",
        imageUrl: "",
        tags: [],
        activityStatus: "completed",
      }),
    ).toEqual({
      name: "下書き",
      tags: [],
      activityStatus: "completed",
    });
  });

  it("rejects blank and overlong names", () => {
    expectProjectError(
      () => parseProjectDraftInput({ name: "   " }),
      PROJECT_ERROR_CODES.NAME_REQUIRED,
    );
    expectProjectError(
      () => parseProjectDraftInput({ name: "a".repeat(81) }),
      PROJECT_ERROR_CODES.NAME_TOO_LONG,
    );
  });

  it("rejects malformed bodies", () => {
    expectProjectError(
      () => parseProjectDraftInput(null),
      PROJECT_ERROR_CODES.INVALID_INPUT,
    );
    expectProjectError(
      () => parseProjectDraftInput({ name: 123 }),
      PROJECT_ERROR_CODES.INVALID_INPUT,
    );
  });

  it("normalizes tags after trimming and preserves internal spaces", () => {
    expect(
      parseProjectDraftInput({
        name: "タグ検証",
        tags: [" GitHub Actions ", "", "  ", "Next.js", "GitHub Actions"],
      }).tags,
    ).toEqual(["GitHub Actions", "Next.js"]);
  });

  it("applies tag limits after normalization", () => {
    expect(
      parseProjectDraftInput({
        name: "重複タグ",
        tags: Array.from({ length: 11 }, () => "same"),
      }).tags,
    ).toEqual(["same"]);

    expectProjectError(
      () =>
        parseProjectDraftInput({
          name: "タグ過多",
          tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
        }),
      PROJECT_ERROR_CODES.TOO_MANY_TAGS,
    );
    expectProjectError(
      () =>
        parseProjectDraftInput({
          name: "長いタグ",
          tags: ["あ".repeat(31)],
        }),
      PROJECT_ERROR_CODES.TAG_TOO_LONG,
    );
  });

  it("validates optional descriptions and images", () => {
    expectProjectError(
      () =>
        parseProjectDraftInput({
          name: "長い説明",
          description: "あ".repeat(501),
        }),
      PROJECT_ERROR_CODES.DESCRIPTION_TOO_LONG,
    );
    expectProjectError(
      () =>
        parseProjectDraftInput({
          name: "不正画像",
          imageUrl: "javascript:alert(1)",
        }),
      PROJECT_ERROR_CODES.INVALID_IMAGE_URL,
    );

    expect(
      parseProjectDraftInput({
        name: "既定画像",
        imageUrl: "/assets/Lumoslogo.png",
      }).imageUrl,
    ).toBe("/assets/Lumoslogo.png");
  });

  it("validates activity status and real ISO completion dates", () => {
    expectProjectError(
      () =>
        parseProjectDraftInput({
          name: "不正状態",
          activityStatus: "paused",
        }),
      PROJECT_ERROR_CODES.INVALID_ACTIVITY_STATUS,
    );
    expectProjectError(
      () =>
        parseProjectDraftInput({
          name: "不正日付",
          activityStatus: "completed",
          completionDate: "2026-02-30",
        }),
      PROJECT_ERROR_CODES.INVALID_COMPLETION_DATE,
    );
  });

  it("drops completionDate unless activity status is completed", () => {
    const parsed = parseProjectDraftInput({
      name: "再開したプロジェクト",
      activityStatus: "active",
      completionDate: "2026-10-01",
    });

    expect(parsed).not.toHaveProperty("completionDate");
  });

  it("strips ownership, publication, and timestamp fields", () => {
    const parsed = parseProjectDraftInput({
      name: "安全な下書き",
      authorId: "attacker",
      publicationStatus: "published",
      approvedBy: "attacker",
      publishedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    expect(parsed).toEqual({ name: "安全な下書き", tags: [] });
  });
});

describe("parseProjectSubmissionInput", () => {
  it("accepts complete planned and active projects without a completion date", () => {
    expect(parseProjectSubmissionInput(validSubmission)).toEqual(
      validSubmission,
    );
    expect(
      parseProjectSubmissionInput({
        ...validSubmission,
        activityStatus: "planned",
        completionDate: "2025-01-01",
      }),
    ).not.toHaveProperty("completionDate");
  });

  it("requires a nonblank description no longer than 500 characters", () => {
    expectProjectError(
      () =>
        parseProjectSubmissionInput({
          ...validSubmission,
          description: "   ",
        }),
      PROJECT_ERROR_CODES.DESCRIPTION_REQUIRED,
    );
    expectProjectError(
      () =>
        parseProjectSubmissionInput({
          ...validSubmission,
          description: "あ".repeat(501),
        }),
      PROJECT_ERROR_CODES.DESCRIPTION_TOO_LONG,
    );
  });

  it("requires a valid activity status", () => {
    const { activityStatus: _activityStatus, ...withoutStatus } =
      validSubmission;
    expectProjectError(
      () => parseProjectSubmissionInput(withoutStatus),
      PROJECT_ERROR_CODES.INVALID_ACTIVITY_STATUS,
    );
  });

  it("requires a real completion date for completed projects", () => {
    expectProjectError(
      () =>
        parseProjectSubmissionInput({
          ...validSubmission,
          activityStatus: "completed",
        }),
      PROJECT_ERROR_CODES.COMPLETION_DATE_REQUIRED,
    );
    expectProjectError(
      () =>
        parseProjectSubmissionInput({
          ...validSubmission,
          activityStatus: "completed",
          completionDate: "2026-13-01",
        }),
      PROJECT_ERROR_CODES.INVALID_COMPLETION_DATE,
    );

    expect(
      parseProjectSubmissionInput({
        ...validSubmission,
        activityStatus: "completed",
        completionDate: "2025-12-01",
      }).completionDate,
    ).toBe("2025-12-01");
  });

  it("strips unknown privileged fields from complete submissions", () => {
    const parsed = parseProjectSubmissionInput({
      ...validSubmission,
      authorId: "attacker",
      publicationStatus: "published",
      approvedBy: "attacker",
    });

    expect(parsed).not.toHaveProperty("authorId");
    expect(parsed).not.toHaveProperty("publicationStatus");
    expect(parsed).not.toHaveProperty("approvedBy");
  });
});
