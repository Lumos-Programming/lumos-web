import * as admin from "firebase-admin";

// Initialize Firebase lazily
function initializeFirebase() {
  if (!admin.apps.length) {
    if (
      process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      // Emulator mode + SA key: Firestore uses emulator, GCS uses real credentials
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Emulator mode without SA key (CI/tests)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "test-project",
      });
    } else if (
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      // Local development with service account key
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Cloud Run or GCE: Use Application Default Credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }
}

// Lazy getter for db
export function getDb() {
  initializeFirebase();
  const databaseId = process.env.FIRESTORE_DATABASE_ID;
  if (databaseId) {
    const { getFirestore } = require("firebase-admin/firestore");
    return getFirestore(databaseId) as admin.firestore.Firestore;
  }
  return admin.firestore();
}

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
