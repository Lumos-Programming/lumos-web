// Compatibility exports; all database operations use the migration-aware boundary.
export { getDb } from "@/lib/database";

// Re-export mini-lt week/talk logic for backward compatibility
export {
  getWeekData,
  addTalk,
  updateTalk,
  deleteTalk,
  saveDiscordEvent,
  removeDiscordEvent,
} from "@/lib/mini-lt/firebase";

export type {
  Talk,
  SerializableTalk,
  WeekData,
  SerializableWeekData,
} from "@/lib/mini-lt/firebase";
