import {
  FieldValue as FirestoreFieldValue,
  Firestore,
  Timestamp as FirestoreTimestamp,
  type DocumentReference,
} from "firebase-admin/firestore";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { DocumentData } from "./types";
import {
  applySet,
  applyUpdate,
  encodeDocument,
  FieldValue,
  Timestamp,
} from "./values";

describe("Timestamp compatibility with the Admin SDK", () => {
  it.each([
    [123, 456789000],
    [123, 999999000],
    [-1, 999999000],
  ])(
    "preserves conversions and API JSON for (%i, %i)",
    (seconds, nanoseconds) => {
      const native = new FirestoreTimestamp(seconds, nanoseconds);
      const portable = new Timestamp(seconds, nanoseconds);

      expect(portable.toMillis()).toBe(native.toMillis());
      expect(portable.toDate()).toEqual(native.toDate());
      expect(JSON.stringify(portable)).toBe(JSON.stringify(native));
    },
  );
});

it("rejects dotted updates instead of interpreting an unused field-path API", () => {
  expect(() =>
    applyUpdate(
      { visibility: { bio: "private" } },
      { "visibility.bio": "public" },
      Timestamp.now(),
    ),
  ).toThrow("top-level field name");
});

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)(
  "application mutations against native Firestore",
  () => {
    let firestore: Firestore;
    let ref: DocumentReference;
    const now = new Timestamp(1_700_000_000, 123000000);
    // Use an explicit native timestamp for the resolved application clock so
    // the comparison does not depend on two different wall-clock reads.
    const nativeNow = new FirestoreTimestamp(now.seconds, now.nanoseconds);

    beforeAll(() => {
      firestore = new Firestore({ projectId: "demo-lumos-values-contract" });
    });
    beforeEach(() => {
      ref = firestore.collection("values_contract").doc();
    });
    afterEach(async () => {
      await ref.delete();
    });
    afterAll(async () => {
      await firestore.terminate();
    });

    async function expectNativeData(expected: DocumentData) {
      const native = (await ref.get()).data()!;
      expect(encodeDocument(expected)).toBe(encodeDocument(native));
    }

    it("overwrites a survey document and resolves its creation timestamp", async () => {
      const previous = { discordId: "member", expectations: "old answer" };
      await ref.set(previous);
      const input = {
        discordId: "member",
        satisfaction: 5,
        createdAt: FieldValue.serverTimestamp(),
      };
      await ref.set({ ...input, createdAt: nativeNow });

      await expectNativeData(applySet(previous, input, false, now));
    });

    it("merges maps, clears an explicit empty map, and removes account flags", async () => {
      const previous = {
        discordUsername: "Member",
        optedOut: true,
        visibility: { bio: "private", nickname: "public" },
        yearByFiscal: { "2025": "2" },
      };
      await ref.set(previous);
      const input = {
        visibility: { bio: "internal" },
        yearByFiscal: {},
        optedOut: FieldValue.delete(),
        linkedAt: FieldValue.serverTimestamp(),
      };
      await ref.set(
        {
          ...input,
          optedOut: FirestoreFieldValue.delete(),
          linkedAt: nativeNow,
        },
        { merge: true },
      );

      await expectNativeData(applySet(previous, input, true, now));
    });

    it("replaces a profile map and deletes a linked account field on update", async () => {
      const previous = {
        visibility: { bio: "private", nickname: "public" },
        lineId: "line-member",
        interests: ["web"],
      };
      await ref.set(previous);
      const input = {
        visibility: { bio: "internal" },
        lineId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await ref.update({
        ...input,
        lineId: FirestoreFieldValue.delete(),
        updatedAt: nativeNow,
      });

      await expectNativeData(applyUpdate(previous, input, now));
      expect(previous.visibility).toEqual({
        bio: "private",
        nickname: "public",
      });
      expect(previous.lineId).toBe("line-member");
    });

    it("replaces the ordered talk array and stores nested timestamps at Firestore precision", async () => {
      const previous = { weekString: "2026-09-21", talks: [] };
      await ref.set(previous);
      const nativeTime = new FirestoreTimestamp(123, 456789123);
      const input = {
        talks: [
          {
            id: "talk",
            title: "Talk",
            order: 1,
            createdAt: new Timestamp(123, 456789123),
          },
        ],
      };
      await ref.update({
        talks: [{ ...input.talks[0], createdAt: nativeTime }],
      });

      await expectNativeData(applyUpdate(previous, input, now));
      expect(previous.talks).toEqual([]);
    });
  },
);
