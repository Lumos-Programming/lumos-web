import { createBackend } from "@/lib/database/backend";
import { replayPendingEvents } from "@/lib/database/database";
import { getMigrationStage, stageBackends } from "@/lib/database/stage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const stage = getMigrationStage();
  const { primary, mirror } = stageBackends(stage);
  // Single-backend stages must not initialize or contact the disabled backend.
  if (!mirror) return Response.json({ stage, delivered: 0, pending: false });
  try {
    const result = await replayPendingEvents(
      await createBackend(primary),
      createBackend,
    );
    return Response.json({ stage, ...result });
  } catch {
    console.error("database_migration_replay_failed", { stage });
    return Response.json(
      { error: "Migration replay failed; pending events retained" },
      { status: 503 },
    );
  }
}
