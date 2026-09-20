import { Database, type BackendFactory } from "./database";
import { getMigrationStage } from "./stage";

export const createBackend: BackendFactory = async (name) => {
  const isWorker =
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers";
  if (isWorker && getMigrationStage() !== "d1-only") {
    throw new Error(
      "Cloudflare Workers requires DATABASE_MIGRATION_STAGE=d1-only; run Firestore migration stages on Cloud Run",
    );
  }
  if (name === "firestore") {
    const { createFirestoreBackend } = await import("./firestore");
    return createFirestoreBackend();
  }
  const { D1Backend } = await import("./d1");
  // The binding is request-scoped. Never cache it across Worker requests.
  if (isWorker || process.env.CLOUDFLARE_DEV === "1") {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    if (!env.DB) throw new Error("Cloudflare D1 binding DB is missing");
    return new D1Backend(env.DB);
  }
  const { D1HttpClient } = await import("./d1-http");
  return new D1Backend(
    new D1HttpClient(
      process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
      process.env.CLOUDFLARE_D1_DATABASE_ID ?? "",
      process.env.CLOUDFLARE_API_TOKEN ?? "",
    ),
  );
};

export function getDb(): Database {
  return new Database(createBackend);
}
