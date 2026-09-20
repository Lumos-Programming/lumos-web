import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { createBackend } from "../lib/database";
import {
  replayPendingEvents,
  type BackendFactory,
} from "../lib/database/database";
import { copyDatabase, verifyDatabases } from "../lib/database/migration";
import { getMigrationStage, stageBackends } from "../lib/database/stage";
import { COLLECTIONS, type BackendName } from "../lib/database/types";

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      local: { type: "boolean" },
      env: { type: "string" },
      from: { type: "string" },
      "writes-paused": { type: "boolean" },
      "env-file": { type: "string" },
    },
  });
  const command = positionals[0];
  if (
    positionals.length !== 1 ||
    !["copy", "verify", "replay"].includes(command)
  )
    throw new Error(
      "Usage: tsx scripts/database-migration.ts copy|verify|replay [--local] [--env dev|stg|prd] [--from firestore|d1] [--writes-paused] [--env-file path]",
    );
  const envFile = values["env-file"] ?? ".env.local";
  if (values["env-file"] || existsSync(envFile)) process.loadEnvFile(envFile);
  const stage = getMigrationStage();
  const routing = stageBackends(stage);
  const sourceName = (values.from ??
    (command === "copy" ? "firestore" : routing.primary)) as BackendName;
  if (!["firestore", "d1"].includes(sourceName))
    throw new Error("--from must be firestore or d1");
  if (values.env && !["dev", "stg", "prd"].includes(values.env))
    throw new Error("--env must be dev, stg or prd");
  if (!values.local && values.env)
    throw new Error(
      "--env selects a local Wrangler environment only; remote CLI uses the explicit account/database IDs in its environment file",
    );
  if (command === "copy" && sourceName !== routing.primary)
    throw new Error("Copy source must be the configured source of truth");
  if (command === "copy" && !routing.mirror && !values["writes-paused"])
    throw new Error(
      "Initial/reverse copy requires --writes-paused. Pause all application writers and cron jobs until dual writes are enabled",
    );
  if (command === "verify" && !values["writes-paused"])
    throw new Error(
      "Cutover verification requires --writes-paused so the comparison describes one stable state",
    );
  if (command === "replay" && !routing.mirror && !values["writes-paused"])
    throw new Error(
      "Replay outside a dual-write stage requires --writes-paused",
    );
  if (
    command === "replay" &&
    sourceName !== routing.primary &&
    !values["writes-paused"]
  )
    throw new Error(
      "Replaying the old source requires --writes-paused before stage rollback",
    );
  let dispose: (() => Promise<void>) | undefined;
  let factory: BackendFactory = createBackend;
  try {
    if (values.local) {
      // A local destination must never silently copy real member data.
      if (!process.env.FIRESTORE_EMULATOR_HOST)
        throw new Error("--local requires FIRESTORE_EMULATOR_HOST");
      const { getPlatformProxy } = await import("wrangler");
      const proxy = await getPlatformProxy<CloudflareEnv>({
        configPath: "wrangler.jsonc",
        environment: values.env,
      });
      dispose = proxy.dispose;
      const { D1Backend } = await import("../lib/database/d1");
      factory = async (name) =>
        name === "d1" ? new D1Backend(proxy.env.DB) : createBackend(name);
    }
    const source = await factory(sourceName);
    const targetName = sourceName === "firestore" ? "d1" : "firestore";
    if (command === "copy") {
      if (sourceName === "firestore") {
        const { getFirestoreDb } = await import("../lib/database/firestore");
        const collections = await getFirestoreDb().listCollections();
        const allowed = new Set<string>([
          ...COLLECTIONS,
          "_migration_versions",
          "_migration_outbox",
        ]);
        if (collections.some((collection) => !allowed.has(collection.id)))
          throw new Error(
            "Unmapped Firestore collection found; add its schema before copying",
          );
        for (const collection of collections.filter((collection) =>
          COLLECTIONS.includes(collection.id as (typeof COLLECTIONS)[number]),
        )) {
          for (const doc of await collection.listDocuments()) {
            if ((await doc.listCollections()).length)
              throw new Error(
                "Unmapped Firestore subcollection found; add its schema before copying",
              );
          }
        }
      }
      console.log(
        JSON.stringify({
          stage,
          source: sourceName,
          target: targetName,
          counts: await copyDatabase(
            source,
            await factory(targetName),
            (collection, count) =>
              console.log(JSON.stringify({ collection, copied: count })),
          ),
        }),
      );
    } else if (command === "verify") {
      const result = await verifyDatabases(source, await factory(targetName));
      console.log(JSON.stringify(result, null, 2));
      if (!result.matches) process.exitCode = 1;
    } else {
      let delivered = 0;
      // Bounded so an active write stream cannot leave this process running forever.
      for (let batch = 0; batch < 100; batch++) {
        const result = await replayPendingEvents(source, factory);
        delivered += result.delivered;
        if (!result.pending) {
          console.log(
            JSON.stringify({ source: sourceName, delivered, pending: false }),
          );
          return;
        }
      }
      console.log(
        JSON.stringify({ source: sourceName, delivered, pending: true }),
      );
      process.exitCode = 1;
    }
  } finally {
    await dispose?.();
    const { getApps, deleteApp } = await import("firebase-admin/app");
    await Promise.all(getApps().map((app) => deleteApp(app)));
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Database migration failed",
  );
  process.exitCode = 1;
});
