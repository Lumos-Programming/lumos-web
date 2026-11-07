import { Database } from "./database";
import { createBackend } from "./backend";

// Application callers use migration-aware operations; maintenance tools import
// backend construction explicitly from ./backend.
export type AppDatabase = Pick<
  Database,
  "collection" | "doc" | "batch" | "runTransaction"
>;

export function getDb(): AppDatabase {
  return new Database(createBackend);
}
