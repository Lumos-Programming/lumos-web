import { D1_COLUMNS, type Column } from "./d1-schema";
import { decodeOutboxDocuments, encodeOutboxDocuments } from "./outbox";
import {
  splitPath,
  type CollectionName,
  type CommitRequest,
  type DatabaseBackend,
  type DocumentData,
  type DocumentImage,
  type OutboxEvent,
  type QueryDocument,
  type QuerySpec,
  type StoredDocument,
} from "./types";
import {
  decodeDocument,
  decodeValue,
  encodeDocument,
  encodeValue,
  isTimestamp,
} from "./values";

export interface D1Result {
  success: boolean;
  results?: Record<string, unknown>[];
  error?: string;
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all(): Promise<D1Result>;
}

// Both the native Workers binding and the authenticated HTTP client implement
// this small interface. All transaction statements must use one batch call.
export interface D1Client {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
}

type SqlValue = string | number | null;

function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function assertRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error("Document revision must be a nonnegative safe integer");
  }
}

function assertLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Query limit must be a positive safe integer");
  }
}

function columnFor(collection: CollectionName, field: string): Column {
  const column = D1_COLUMNS[collection].find(
    (candidate) => candidate.field === field,
  );
  if (!column || column.kind === "json") {
    throw new Error(`Unsupported D1 query field: ${collection}.${field}`);
  }
  return column;
}

function scalarValue(column: Column, value: unknown): SqlValue | undefined {
  if (value === null) return null;
  if (column.kind === "text" && typeof value === "string") return value;
  if (
    column.kind === "number" &&
    typeof value === "number" &&
    Number.isFinite(value)
  )
    return value;
  if (column.kind === "boolean" && typeof value === "boolean")
    return value ? 1 : 0;
  if (
    column.kind === "timestamp" &&
    isTimestamp(value) &&
    Number.isInteger(value.seconds) &&
    Number.isInteger(value.nanoseconds) &&
    value.nanoseconds >= 0 &&
    value.nanoseconds < 1e9
  ) {
    // The public SDK-compatible toMillis() truncates submillisecond precision;
    // SQL comparisons must retain it when indexing migrated timestamps.
    const milliseconds = value.seconds * 1000 + value.nanoseconds / 1e6;
    if (Number.isFinite(milliseconds)) return milliseconds;
  }
  return undefined;
}

function rowData(
  collection: CollectionName,
  row: Record<string, unknown>,
): DocumentData | null {
  if (row.deleted === 1) return null;
  const data = decodeDocument(String(row.extra_fields));
  const present = new Set<string>(JSON.parse(String(row.present_fields)));
  const timestamps: Record<string, unknown> = JSON.parse(
    String(row.timestamp_values),
  );
  for (const column of D1_COLUMNS[collection]) {
    if (!present.has(column.field)) continue;
    const value = row[column.name];
    if (value === null) data[column.field] = null;
    else if (column.kind === "timestamp")
      data[column.field] = decodeValue(timestamps[column.field]);
    else if (column.kind === "json")
      data[column.field] = decodeValue(JSON.parse(String(value)));
    else if (column.kind === "boolean") data[column.field] = value === 1;
    else data[column.field] = value;
  }
  return data;
}

function storedDocument(
  collection: CollectionName,
  row: Record<string, unknown>,
): StoredDocument {
  const revision = Number(row.revision);
  return {
    path: `${collection}/${String(row.id)}`,
    data: rowData(collection, row),
    revision,
    token: String(revision),
  };
}

function resultRows(result: D1Result): Record<string, unknown>[] {
  if (!result.success) throw new Error(result.error ?? "D1 query failed");
  return result.results ?? [];
}

export class D1Backend implements DatabaseBackend {
  readonly name = "d1" as const;

  constructor(private readonly client: D1Client) {}

  async get(path: string): Promise<StoredDocument> {
    const [collection, id] = splitPath(path);
    const rows = resultRows(
      await this.client
        .prepare(`SELECT * FROM ${quote(collection)} WHERE id = ?`)
        .bind(id)
        .all(),
    );
    return rows.length
      ? storedDocument(collection, rows[0])
      : { path, data: null, revision: -1, token: "-1" };
  }

  async query(query: QuerySpec): Promise<QueryDocument[]> {
    // Validate the collection at runtime too: identifiers must never originate
    // from untrusted query text.
    splitPath(`${query.collection}/_`);
    const conditions = ["deleted = 0"];
    const parameters: SqlValue[] = [];
    for (const filter of query.filters ?? []) {
      const column = columnFor(query.collection, filter.field);
      const value = scalarValue(column, filter.value);
      if (value === undefined)
        throw new Error(
          `Invalid value for ${query.collection}.${filter.field}`,
        );
      if (filter.operator !== "==" && filter.operator !== "!=")
        throw new Error("Unsupported D1 query operator");
      if (value === null) {
        if (filter.operator === "==") {
          conditions.push(
            `${quote(column.name)} IS NULL AND EXISTS (SELECT 1 FROM json_each(present_fields) WHERE value = ?)`,
          );
          parameters.push(column.field);
        } else conditions.push(`${quote(column.name)} IS NOT NULL`);
      } else {
        conditions.push(
          `${quote(column.name)} ${filter.operator === "==" ? "=" : "!="} ?`,
        );
        parameters.push(value);
      }
    }
    let order = "id ASC";
    if (query.order) {
      const column = columnFor(query.collection, query.order.field);
      if (query.order.direction !== "asc" && query.order.direction !== "desc")
        throw new Error("Unsupported D1 ordering");
      // Firestore orderBy excludes documents that do not contain the field.
      conditions.push(
        "EXISTS (SELECT 1 FROM json_each(present_fields) WHERE value = ?)",
      );
      parameters.push(column.field);
      const direction = query.order.direction.toUpperCase();
      order = `${quote(column.name)} ${direction}, id ${direction}`;
    }
    let sql = `SELECT * FROM ${quote(query.collection)} WHERE ${conditions.join(" AND ")} ORDER BY ${order}`;
    if (query.limit !== undefined) {
      assertLimit(query.limit);
      sql += " LIMIT ?";
      parameters.push(query.limit);
    }
    const rows = resultRows(
      await this.client
        .prepare(sql)
        .bind(...parameters)
        .all(),
    );
    return rows.map((row) => ({
      path: `${query.collection}/${String(row.id)}`,
      data: rowData(query.collection, row)!,
    }));
  }

  async scan(
    collection: CollectionName,
    after?: string,
    limit = 100,
  ): Promise<StoredDocument[]> {
    splitPath(`${collection}/_`);
    assertLimit(limit);
    const rows = resultRows(
      await this.client
        .prepare(
          `SELECT * FROM ${quote(collection)} WHERE id > ? ORDER BY id ASC LIMIT ?`,
        )
        .bind(after ?? "", limit)
        .all(),
    );
    return rows.map((row) => storedDocument(collection, row));
  }

  private imageStatement(document: DocumentImage): D1Statement {
    const [collection, id] = splitPath(document.path);
    assertRevision(document.revision);
    const columns = D1_COLUMNS[collection];
    const extra = { ...(document.data ?? {}) };
    const present: string[] = [];
    const timestamps: Record<string, unknown> = {};
    const values = columns.map((column): SqlValue => {
      if (!document.data || !Object.hasOwn(document.data, column.field))
        return null;
      const value: unknown = document.data[column.field];
      const scalar =
        column.kind === "json"
          ? JSON.stringify(encodeValue(value))
          : scalarValue(column, value);
      // Retain malformed historical scalar values in extra_fields rather than
      // coercing them to a different type during a copy.
      if (scalar === undefined) return null;
      delete extra[column.field];
      present.push(column.field);
      if (column.kind === "timestamp" && value !== null)
        timestamps[column.field] = encodeValue(value);
      return scalar;
    });
    const names = [
      "id",
      "revision",
      "deleted",
      "present_fields",
      "timestamp_values",
      "extra_fields",
      ...columns.map((column) => column.name),
    ];
    const parameters: SqlValue[] = [
      id,
      document.revision,
      document.data === null ? 1 : 0,
      JSON.stringify(present),
      JSON.stringify(timestamps),
      encodeDocument(extra),
      ...values,
    ];
    const updates = names
      .slice(1)
      .map((name) => `${quote(name)} = excluded.${quote(name)}`)
      .join(", ");
    return this.client
      .prepare(
        `INSERT INTO ${quote(collection)} (${names.map(quote).join(", ")}) VALUES (${parameters.map(() => "?").join(", ")}) ON CONFLICT(id) DO UPDATE SET ${updates} WHERE excluded.revision > ${quote(collection)}.revision`,
      )
      .bind(...parameters);
  }

  async commit(request: CommitRequest): Promise<boolean> {
    const statements: D1Statement[] = [];
    const checks = new Map(request.checks.map((check) => [check.path, check]));
    if (checks.size !== request.checks.length)
      throw new Error("Duplicate transaction read checks");
    const written = new Set<string>();
    for (const document of request.documents) {
      const check = checks.get(document.path);
      if (!check)
        throw new Error(`Missing transaction read check: ${document.path}`);
      if (written.has(document.path))
        throw new Error(`Duplicate transaction write: ${document.path}`);
      if (document.revision <= check.revision)
        throw new Error(
          "A committed revision must advance the checked revision",
        );
      written.add(document.path);
    }
    for (const check of request.checks) {
      const [collection, id] = splitPath(check.path);
      if (
        !Number.isSafeInteger(check.revision) ||
        check.revision < -1 ||
        check.token !== String(check.revision)
      )
        throw new Error("Invalid D1 concurrency token");
      // The named CHECK violation aborts the entire D1 batch. Read checks for
      // documents that are not written are equally important to transaction
      // isolation (e.g. checking ownership before modifying another document).
      statements.push(
        this.client
          .prepare(
            `INSERT INTO migration_guard (value) SELECT CASE WHEN COALESCE((SELECT revision FROM ${quote(collection)} WHERE id = ?), -1) = ? THEN 1 ELSE 0 END`,
          )
          .bind(id, check.revision),
      );
    }
    statements.push(
      ...request.documents.map((document) => this.imageStatement(document)),
    );
    if (request.outbox) {
      const event = request.outbox;
      const chunks = encodeOutboxDocuments(event.documents);
      statements.push(
        this.client
          .prepare(
            "INSERT INTO migration_outbox (id, target, created_at, chunk_count) VALUES (?, ?, ?, ?)",
          )
          .bind(event.id, event.target, event.createdAt, chunks.length),
        ...chunks.map((payload, ordinal) =>
          this.client
            .prepare(
              "INSERT INTO migration_outbox_chunks (event_id, ordinal, payload) VALUES (?, ?, ?)",
            )
            .bind(event.id, ordinal, payload),
        ),
      );
    }
    if (request.checks.length)
      statements.push(this.client.prepare("DELETE FROM migration_guard"));
    if (!statements.length) return true;
    try {
      for (const result of await this.client.batch(statements))
        resultRows(result);
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("migration_revision_matches")
      )
        return false;
      throw error;
    }
  }

  async applyReplica(documents: DocumentImage[]): Promise<void> {
    if (!documents.length) return;
    for (const result of await this.client.batch(
      documents.map((document) => this.imageStatement(document)),
    ))
      resultRows(result);
  }

  async pendingEvents(limit: number): Promise<OutboxEvent[]> {
    assertLimit(limit);
    const rows = resultRows(
      await this.client
        .prepare(
          `WITH pending AS (
            SELECT id, target, created_at, chunk_count FROM migration_outbox
            ORDER BY created_at ASC, id ASC LIMIT ?
          )
          SELECT pending.*, chunks.ordinal, chunks.payload FROM pending
          LEFT JOIN migration_outbox_chunks AS chunks ON chunks.event_id = pending.id
          ORDER BY pending.created_at ASC, pending.id ASC, chunks.ordinal ASC`,
        )
        .bind(limit)
        .all(),
    );
    const events = new Map<
      string,
      { header: Record<string, unknown>; chunks: string[] }
    >();
    for (const row of rows) {
      const id = String(row.id);
      let event = events.get(id);
      if (!event) {
        event = { header: row, chunks: [] };
        events.set(id, event);
      }
      if (
        row.ordinal !== event.chunks.length ||
        typeof row.payload !== "string"
      )
        throw new Error("Missing migration outbox chunk");
      event.chunks.push(row.payload);
    }
    return [...events].map(([id, { header, chunks }]) => {
      if (chunks.length !== header.chunk_count)
        throw new Error("Incomplete migration outbox payload");
      return {
        id,
        target: header.target as OutboxEvent["target"],
        createdAt: Number(header.created_at),
        documents: decodeOutboxDocuments(chunks),
      };
    });
  }

  async acknowledgeEvent(id: string): Promise<void> {
    const results = await this.client.batch([
      this.client.prepare("DELETE FROM migration_outbox WHERE id = ?").bind(id),
    ]);
    for (const result of results) resultRows(result);
  }
}
