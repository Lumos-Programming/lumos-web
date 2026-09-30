import type { BackendName } from "./types";

export const MIGRATION_STAGES = [
  "firestore-only",
  "firestore-primary",
  "d1-primary",
  "d1-only",
] as const;
export type MigrationStage = (typeof MIGRATION_STAGES)[number];

export function getMigrationStage(
  value = process.env.DATABASE_MIGRATION_STAGE,
): MigrationStage {
  if (value === undefined) return "firestore-only";
  if (!MIGRATION_STAGES.includes(value as MigrationStage)) {
    throw new Error(
      `Invalid DATABASE_MIGRATION_STAGE: ${value}. Expected ${MIGRATION_STAGES.join(", ")}`,
    );
  }
  return value as MigrationStage;
}

export function stageBackends(stage: MigrationStage): {
  primary: BackendName;
  mirror?: BackendName;
} {
  switch (stage) {
    case "firestore-only":
      return { primary: "firestore" };
    case "firestore-primary":
      return { primary: "firestore", mirror: "d1" };
    case "d1-primary":
      return { primary: "d1", mirror: "firestore" };
    case "d1-only":
      return { primary: "d1" };
  }
}
