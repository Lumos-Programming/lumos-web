import type { DocumentData } from "./types";

/** Storage-neutral timestamp; keeps Firestore nanosecond precision on migration. */
export class Timestamp {
  constructor(
    public readonly seconds: number,
    public readonly nanoseconds: number,
  ) {
    if (
      !Number.isInteger(seconds) ||
      !Number.isInteger(nanoseconds) ||
      nanoseconds < 0 ||
      nanoseconds >= 1e9
    ) {
      throw new Error("Invalid timestamp");
    }
  }
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }
  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }
  static fromMillis(milliseconds: number): Timestamp {
    const seconds = Math.floor(milliseconds / 1000);
    return new Timestamp(
      seconds,
      Math.floor((milliseconds - seconds * 1000) * 1e6),
    );
  }
  toMillis(): number {
    return this.seconds * 1000 + this.nanoseconds / 1e6;
  }
  toDate(): Date {
    return new Date(this.toMillis());
  }
  isEqual(other: Timestamp): boolean {
    return (
      this.seconds === other.seconds && this.nanoseconds === other.nanoseconds
    );
  }
}

class FieldTransform {
  constructor(readonly kind: "delete" | "serverTimestamp") {}
}
export const FieldValue = {
  delete: () => new FieldTransform("delete"),
  serverTimestamp: () => new FieldTransform("serverTimestamp"),
};

export function isTimestamp(value: unknown): value is Timestamp {
  return (
    value instanceof Timestamp ||
    (value !== null &&
      typeof value === "object" &&
      "seconds" in value &&
      "nanoseconds" in value &&
      "toMillis" in value &&
      typeof value.toMillis === "function")
  );
}

// Every node is tagged, so a user-supplied object can never be mistaken for a
// timestamp marker. Sort keys to make checksums deterministic across backends.
export function encodeValue(value: unknown): unknown {
  if (isTimestamp(value))
    return ["timestamp", value.seconds, value.nanoseconds];
  if (value instanceof Date) return encodeValue(Timestamp.fromDate(value));
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return ["scalar", value];
  if (typeof value === "number" && Number.isFinite(value))
    return ["scalar", value];
  if (Array.isArray(value)) return ["array", value.map(encodeValue)];
  if (isPlainObject(value))
    return [
      "object",
      Object.keys(value)
        .sort()
        .map((key) => [key, encodeValue(value[key])]),
    ];
  throw new Error(
    "Unsupported database value (undefined, non-finite number or custom object)",
  );
}

export function decodeValue(value: unknown): any {
  if (!Array.isArray(value)) throw new Error("Invalid encoded database value");
  switch (value[0]) {
    case "timestamp":
      return new Timestamp(value[1], value[2]);
    case "scalar":
      return value[1];
    case "array":
      return value[1].map(decodeValue);
    case "object":
      return Object.fromEntries(
        value[1].map(([key, child]: [string, unknown]) => [
          key,
          decodeValue(child),
        ]),
      );
    default:
      throw new Error("Invalid encoded database value tag");
  }
}
export function encodeDocument(data: DocumentData): string {
  return JSON.stringify(encodeValue(data));
}
export function decodeDocument(json: string): DocumentData {
  return decodeValue(JSON.parse(json));
}

function isPlainObject(value: unknown): value is DocumentData {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function resolve(value: unknown, now: Timestamp): unknown {
  if (value instanceof FieldTransform) {
    if (value.kind === "delete")
      throw new Error("Field deletion is only supported in a merge or update");
    return now;
  }
  if (isTimestamp(value))
    return new Timestamp(
      value.seconds,
      Math.floor(value.nanoseconds / 1000) * 1000,
    );
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (Array.isArray(value)) return value.map((child) => resolve(child, now));
  if (isPlainObject(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, resolve(child, now)]),
    );
  // Validate before either backend sees the write.
  encodeValue(value);
  return value;
}

function mergeMap(
  target: DocumentData,
  input: DocumentData,
  now: Timestamp,
): DocumentData {
  const result = { ...target };
  for (const [key, value] of Object.entries(input)) {
    if (value instanceof FieldTransform && value.kind === "delete")
      delete result[key];
    else if (isPlainObject(value) && Object.keys(value).length > 0)
      result[key] = mergeMap(
        isPlainObject(result[key]) ? result[key] : {},
        value,
        now,
      );
    else result[key] = resolve(value, now);
  }
  return result;
}

export function applySet(
  previous: DocumentData | null,
  input: DocumentData,
  merge: boolean,
  now: Timestamp,
): DocumentData {
  return merge
    ? mergeMap(previous ?? {}, input, now)
    : (resolve(input, now) as DocumentData);
}

export function applyUpdate(
  previous: DocumentData | null,
  input: DocumentData,
  now: Timestamp,
): DocumentData {
  if (!previous) throw new Error("Document not found");
  const result = decodeDocument(encodeDocument(previous));
  for (const [field, value] of Object.entries(input)) {
    const parts = field.split(".");
    if (
      parts.some(
        (part) =>
          !part || ["__proto__", "constructor", "prototype"].includes(part),
      )
    )
      throw new Error("Invalid update field path");
    let target = result;
    for (const part of parts.slice(0, -1)) {
      if (!isPlainObject(target[part])) target[part] = {};
      target = target[part];
    }
    const key = parts[parts.length - 1];
    if (value instanceof FieldTransform && value.kind === "delete")
      delete target[key];
    else target[key] = resolve(value, now);
  }
  return result;
}
