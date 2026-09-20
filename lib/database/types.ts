// The storage boundary carries committed document images. Domain operations are
// evaluated once on the primary; replicas never re-run business logic.
export type DocumentData = Record<string, any>;

export const COLLECTIONS = [
  "members",
  "blogs",
  "news",
  "weeks",
  "line_invitations",
  "optout_submissions",
  "survey_optout",
  "surveys",
  "events",
  "system",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];
export type BackendName = "firestore" | "d1";

export interface StoredDocument {
  path: string;
  data: DocumentData | null;
  // -1 means never stored. Deleted documents retain a nonnegative revision.
  revision: number;
  // An adapter-specific optimistic concurrency token, not copied to replicas.
  token: string;
}

export interface DocumentImage {
  path: string;
  data: DocumentData | null;
  revision: number;
}

export interface OutboxEvent {
  id: string;
  target: BackendName;
  createdAt: number;
  documents: DocumentImage[];
}

export interface QuerySpec {
  collection: CollectionName;
  filters?: { field: string; operator: "==" | "!="; value: unknown }[];
  order?: { field: string; direction: "asc" | "desc" };
  limit?: number;
}

export interface CommitRequest {
  checks: StoredDocument[];
  documents: DocumentImage[];
  outbox?: OutboxEvent;
}

export interface DatabaseBackend {
  readonly name: BackendName;
  get(path: string): Promise<StoredDocument>;
  query(query: QuerySpec): Promise<StoredDocument[]>;
  // Return false on a stale read. Check all reads and atomically write all images
  // and the outbox event, or write nothing at all.
  commit(request: CommitRequest): Promise<boolean>;
  // Atomically apply only strictly newer revisions, including deletion markers.
  applyReplica(documents: DocumentImage[]): Promise<void>;
  pendingEvents(limit: number): Promise<OutboxEvent[]>;
  acknowledgeEvent(id: string): Promise<void>;
  // Includes deletion markers. Cursor is the last returned document ID.
  scan(
    collection: CollectionName,
    after?: string,
    limit?: number,
  ): Promise<StoredDocument[]>;
}

export function splitPath(path: string): [CollectionName, string] {
  const parts = path.split("/");
  if (
    parts.length !== 2 ||
    !parts[1] ||
    !COLLECTIONS.includes(parts[0] as CollectionName)
  ) {
    throw new Error(`Unsupported database document path: ${path}`);
  }
  return [parts[0] as CollectionName, parts[1]];
}

// Firestore document IDs and SQLite BINARY collation use UTF-8 byte ordering,
// which differs from JavaScript's UTF-16 ordering for supplementary characters.
export function compareDocumentIds(left: string, right: string): number {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}
