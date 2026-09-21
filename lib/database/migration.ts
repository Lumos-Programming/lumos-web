import {
  COLLECTIONS,
  compareDocumentIds,
  type BackendName,
  type DatabaseBackend,
  type StoredDocument,
} from "./types";
import { encodeDocument } from "./values";

async function* scanAll(
  backend: DatabaseBackend,
  collection: (typeof COLLECTIONS)[number],
) {
  let after: string | undefined;
  while (true) {
    const page = await backend.scan(collection, after, 100);
    if (!page.length) return;
    yield page;
    const next = page[page.length - 1].path.split("/")[1];
    if (after !== undefined && compareDocumentIds(next, after) <= 0)
      throw new Error("Database scan cursor did not advance");
    after = next;
  }
}

export async function copyDatabase(
  source: DatabaseBackend,
  target: DatabaseBackend,
  onProgress?: (collection: string, count: number) => void,
) {
  if (source.name === target.name)
    throw new Error("Copy source and target must differ");
  const counts: Record<string, number> = {};
  for (const collection of COLLECTIONS) {
    counts[collection] = 0;
    for await (const page of scanAll(source, collection)) {
      // A replayed page is safe, including deletes: replicas only accept newer
      // revisions. Small groups stay below Firestore and D1 transaction limits.
      for (let index = 0; index < page.length; index += 20) {
        await target.applyReplica(
          page
            .slice(index, index + 20)
            .map(({ path, data, revision }) => ({ path, data, revision })),
        );
      }
      counts[collection] += page.length;
      onProgress?.(collection, counts[collection]);
    }
  }
  return counts;
}

function comparable(row: StoredDocument): string {
  return `${row.revision}:${row.data === null ? "deleted" : encodeDocument(row.data)}`;
}

export interface VerificationResult {
  matches: boolean;
  pending: Record<BackendName, boolean>;
  collections: {
    collection: string;
    sourceCount: number;
    targetCount: number;
    differences: number;
    sourceChecksum: string;
    targetChecksum: string;
  }[];
}

async function checksum(rows: Map<string, string>): Promise<string> {
  const data = new TextEncoder().encode(
    JSON.stringify([...rows].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Run with all writers paused before switching stages. No member data is logged. */
export async function verifyDatabases(
  source: DatabaseBackend,
  target: DatabaseBackend,
): Promise<VerificationResult> {
  if (source.name === target.name)
    throw new Error("Verification source and target must differ");
  const pending = { firestore: false, d1: false };
  pending[source.name] = (await source.pendingEvents(1)).length > 0;
  pending[target.name] = (await target.pendingEvents(1)).length > 0;
  const collections: VerificationResult["collections"] = [];
  for (const collection of COLLECTIONS) {
    const left = new Map<string, string>();
    const right = new Map<string, string>();
    for await (const page of scanAll(source, collection))
      for (const row of page) left.set(row.path, comparable(row));
    for await (const page of scanAll(target, collection))
      for (const row of page) right.set(row.path, comparable(row));
    const keys = new Set([...left.keys(), ...right.keys()]);
    const differences = [...keys].filter(
      (key) => left.get(key) !== right.get(key),
    ).length;
    collections.push({
      collection,
      sourceCount: left.size,
      targetCount: right.size,
      differences,
      sourceChecksum: await checksum(left),
      targetChecksum: await checksum(right),
    });
  }
  return {
    matches:
      !pending.firestore &&
      !pending.d1 &&
      collections.every((row) => row.differences === 0),
    pending,
    collections,
  };
}
