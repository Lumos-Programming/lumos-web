import type { CollectionName } from "./types";

export type ColumnKind = "text" | "number" | "boolean" | "timestamp" | "json";
export interface Column {
  field: string;
  name: string;
  kind: ColumnKind;
}

function fields(kind: ColumnKind, names: string): Column[] {
  return names
    .split(" ")
    .filter(Boolean)
    .map((field) => ({
      field,
      name: field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      kind,
    }));
}

// Scalar fields remain directly queryable in SQL. JSON is reserved for nested
// domain values; extra_fields preserves unrecognized fields during migration.
export const D1_COLUMNS: Record<CollectionName, readonly Column[]> = {
  members: [
    ...fields(
      "text",
      "discordUsername discordHandle discordAvatar studentId nickname lastName firstName lastNameRomaji firstNameRomaji bio role memberType currentOrg birthDate gender github githubId githubAvatar x xId xAvatar line lineId lineAvatar linkedin lineAccessToken lineRefreshToken faceImage bannerImage customPublicImage publicImageOption ringColor subAccountDiscordId primaryDiscordId",
    ),
    ...fields("number", "lineLinkedAt lineTokenExpiresAt"),
    ...fields(
      "boolean",
      "allowPublic isSubAccount onboardingCompleted optedOut",
    ),
    ...fields(
      "timestamp",
      "optedOutAt lastLoginAt createdAt updatedAt linkedAt",
    ),
    ...fields(
      "json",
      "yearByFiscal enrollments interests topInterests visibility",
    ),
  ],
  blogs: [
    ...fields(
      "text",
      "authorId url title publishedAt description thumbnailUrl platform",
    ),
    ...fields("number", "createdAt"),
  ],
  news: [
    ...fields("text", "date title summary body image category status authorId"),
    ...fields("timestamp", "publishedAt createdAt updatedAt"),
  ],
  weeks: [
    ...fields(
      "text",
      "weekString eventStartTime discordEventId discordEventUrl",
    ),
    // Talks are the transaction unit in the existing domain: replacing the
    // complete ordered array must be atomic with the week's other fields.
    ...fields("json", "talks"),
  ],
  line_invitations: [
    ...fields(
      "text",
      "userId lineId pendingLine pendingLineId pendingLineAvatar pendingLineAccessToken pendingLineRefreshToken",
    ),
    ...fields("number", "pendingLineTokenExpiresAt"),
    ...fields("boolean", "used"),
    ...fields("timestamp", "createdAt expiresAt"),
  ],
  optout_submissions: [
    ...fields("text", "discordId kind userAgent ipHash"),
    ...fields("timestamp", "confirmedAt"),
  ],
  survey_optout: [
    ...fields("text", "discordId reason reasonDetail"),
    ...fields("timestamp", "createdAt updatedAt confirmedAt"),
  ],
  surveys: [
    ...fields("text", "discordId type satisfactionReason expectations"),
    ...fields("number", "satisfaction"),
    ...fields("timestamp", "createdAt"),
  ],
  events: fields("text", "title description date location"),
  system: fields("number", "lastRunAt"),
};
