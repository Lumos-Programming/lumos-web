import { describe, expect, it } from "vitest";
import { decodeOutboxDocuments, encodeOutboxDocuments } from "./outbox";
import type { DocumentImage } from "./types";
import { Timestamp } from "./values";

describe("durable outbox payloads", () => {
  it("round trips escaped text, Unicode, timestamps and deletion images across bounded chunks", () => {
    const documents: DocumentImage[] = [
      {
        path: "news/large",
        revision: 2,
        data: {
          body: '\\"😀日本語'.repeat(100_000),
          publishedAt: new Timestamp(1_700_000_000, 123456000),
          nested: { values: [null, true, { text: "end" }] },
        },
      },
      { path: "news/deleted", revision: 3, data: null },
    ];
    const chunks = encodeOutboxDocuments(documents);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(256 * 1024);
      expect(chunk).toMatch(/^[A-Za-z0-9+/]+=*$/);
    }
    expect(decodeOutboxDocuments(chunks)).toEqual(documents);
  });

  it("round trips an empty event", () => {
    expect(decodeOutboxDocuments(encodeOutboxDocuments([]))).toEqual([]);
  });
});
