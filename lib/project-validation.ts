import { z } from "zod";
import { isISODateString, type ISODateString } from "@/lib/date";
import {
  PROJECT_ACTIVITY_STATUSES,
  PROJECT_ERROR_CODES,
  ProjectError,
  type ProjectActivityStatus,
} from "@/types/project";

export interface ProjectDraftInput {
  name: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  activityStatus?: ProjectActivityStatus;
  completionDate?: ISODateString;
}

export interface ProjectSubmissionInput extends ProjectDraftInput {
  description: string;
  activityStatus: ProjectActivityStatus;
}

const projectInputSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  activityStatus: z.unknown().optional(),
  completionDate: z.unknown().optional(),
});

function isProjectActivityStatus(
  value: unknown,
): value is ProjectActivityStatus {
  return PROJECT_ACTIVITY_STATUSES.includes(value as ProjectActivityStatus);
}

function optionalNonempty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : value;
}

function validateName(name: string): string {
  const normalized = name.trim();
  if (normalized === "") {
    throw new ProjectError(PROJECT_ERROR_CODES.NAME_REQUIRED);
  }
  if (normalized.length > 80) {
    throw new ProjectError(PROJECT_ERROR_CODES.NAME_TOO_LONG);
  }
  return normalized;
}

function validateDescription(
  description: string | undefined,
  required: boolean,
): string | undefined {
  const normalized = optionalNonempty(description);
  if (required && normalized === undefined) {
    throw new ProjectError(PROJECT_ERROR_CODES.DESCRIPTION_REQUIRED);
  }
  if (normalized && normalized.length > 500) {
    throw new ProjectError(PROJECT_ERROR_CODES.DESCRIPTION_TOO_LONG);
  }
  return normalized;
}

function validateImageUrl(imageUrl: string | undefined): string | undefined {
  const normalized = optionalNonempty(imageUrl)?.trim();
  if (normalized && !/^(https?:\/\/|\/)/.test(normalized)) {
    throw new ProjectError(PROJECT_ERROR_CODES.INVALID_IMAGE_URL);
  }
  return normalized;
}

function normalizeTags(tags: string[] | undefined): string[] {
  const normalized = [
    ...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  ];
  if (normalized.length > 10) {
    throw new ProjectError(PROJECT_ERROR_CODES.TOO_MANY_TAGS);
  }
  if (normalized.some((tag) => tag.length > 30)) {
    throw new ProjectError(PROJECT_ERROR_CODES.TAG_TOO_LONG);
  }
  return normalized;
}

function parseBase(body: unknown): {
  name: string;
  description?: string;
  imageUrl?: string;
  tags: string[];
  activityStatus?: ProjectActivityStatus;
  completionDate?: ISODateString;
} {
  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ProjectError(PROJECT_ERROR_CODES.INVALID_INPUT);
  }

  const activityStatus = parsed.data.activityStatus;
  if (
    activityStatus !== undefined &&
    !isProjectActivityStatus(activityStatus)
  ) {
    throw new ProjectError(PROJECT_ERROR_CODES.INVALID_ACTIVITY_STATUS);
  }

  let completionDate: ISODateString | undefined;
  if (
    activityStatus === "completed" &&
    parsed.data.completionDate !== undefined
  ) {
    if (!isISODateString(parsed.data.completionDate)) {
      throw new ProjectError(PROJECT_ERROR_CODES.INVALID_COMPLETION_DATE);
    }
    completionDate = parsed.data.completionDate;
  }

  return {
    name: validateName(parsed.data.name),
    description: optionalNonempty(parsed.data.description),
    imageUrl: validateImageUrl(parsed.data.imageUrl),
    tags: normalizeTags(parsed.data.tags),
    activityStatus,
    completionDate,
  };
}

export function parseProjectDraftInput(body: unknown): ProjectDraftInput {
  const parsed = parseBase(body);
  const description = validateDescription(parsed.description, false);

  return {
    name: parsed.name,
    ...(description ? { description } : {}),
    ...(parsed.imageUrl ? { imageUrl: parsed.imageUrl } : {}),
    tags: parsed.tags,
    ...(parsed.activityStatus ? { activityStatus: parsed.activityStatus } : {}),
    ...(parsed.completionDate ? { completionDate: parsed.completionDate } : {}),
  };
}

export function parseProjectSubmissionInput(
  body: unknown,
): ProjectSubmissionInput {
  const parsed = parseBase(body);
  const description = validateDescription(parsed.description, true)!;
  if (!parsed.activityStatus) {
    throw new ProjectError(PROJECT_ERROR_CODES.INVALID_ACTIVITY_STATUS);
  }
  if (parsed.activityStatus === "completed" && !parsed.completionDate) {
    throw new ProjectError(PROJECT_ERROR_CODES.COMPLETION_DATE_REQUIRED);
  }

  return {
    name: parsed.name,
    description,
    ...(parsed.imageUrl ? { imageUrl: parsed.imageUrl } : {}),
    tags: parsed.tags,
    activityStatus: parsed.activityStatus,
    ...(parsed.completionDate ? { completionDate: parsed.completionDate } : {}),
  };
}
