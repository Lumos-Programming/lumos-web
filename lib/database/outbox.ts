import { Buffer } from "node:buffer";
import type { DocumentImage } from "./types";
import { decodeValue, encodeValue } from "./values";

// ASCII chunks stay safely below Firestore's 1 MiB document and D1's 2 MB
// row limits, including when JSON escapes or multibyte characters expand data.
const CHUNK_BYTES = 256 * 1024;

export function encodeOutboxDocuments(documents: DocumentImage[]): string[] {
  const payload = Buffer.from(
    JSON.stringify(
      documents.map((document) => ({
        ...document,
        data: document.data === null ? null : encodeValue(document.data),
      })),
    ),
    "utf8",
  ).toString("base64");
  const chunks: string[] = [];
  for (let offset = 0; offset < payload.length; offset += CHUNK_BYTES)
    chunks.push(payload.slice(offset, offset + CHUNK_BYTES));
  return chunks;
}

export function decodeOutboxDocuments(chunks: string[]): DocumentImage[] {
  const documents = JSON.parse(
    Buffer.from(chunks.join(""), "base64").toString("utf8"),
  ) as DocumentImage[];
  return documents.map((document) => ({
    ...document,
    data: document.data === null ? null : decodeValue(document.data),
  }));
}
