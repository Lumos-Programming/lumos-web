import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_ERROR_CODES, EventError } from "@/types/event";
import { GET, POST } from "./route";
import { DELETE } from "./[memberId]/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  listAttendances: vi.fn(),
  recordAttendance: vi.fn(),
  removeAttendance: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/attendance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/attendance")>();
  return {
    parseAttendanceBody: actual.parseAttendanceBody,
    parseMemberIdParam: actual.parseMemberIdParam,
    listAttendances: mocks.listAttendances,
    recordAttendance: mocks.recordAttendance,
    removeAttendance: mocks.removeAttendance,
  };
});

const ADMIN = { user: { id: "admin-1", isAdmin: true } };
const params = (id = "ev1", memberId = "alice") => ({
  params: Promise.resolve({ id, memberId }),
});
const post = (body: unknown) =>
  POST(
    new Request("https://example.test", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    params(),
  );
const get = () => GET(new Request("https://example.test"), params());
const del = (memberId = "alice") =>
  DELETE(new Request("https://example.test"), params("ev1", memberId));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue(ADMIN);
  mocks.listAttendances.mockResolvedValue([]);
  mocks.recordAttendance.mockResolvedValue({ created: true });
  mocks.removeAttendance.mockResolvedValue({ removed: true });
});

describe.each([
  { name: "GET", call: get },
  { name: "POST", call: () => post({ memberId: "alice" }) },
  { name: "DELETE", call: () => del() },
])("$name authorization", ({ call }) => {
  it("returns 401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it.each([
    { name: "non-admin", session: { user: { id: "u1" } } },
    {
      name: "opted-out admin",
      session: { user: { id: "u1", isAdmin: true, optedOut: true } },
    },
  ])("returns 403 for $name", async ({ session }) => {
    mocks.auth.mockResolvedValue(session);
    expect((await call()).status).toBe(403);
    expect(mocks.recordAttendance).not.toHaveBeenCalled();
    expect(mocks.removeAttendance).not.toHaveBeenCalled();
    expect(mocks.listAttendances).not.toHaveBeenCalled();
  });
});

describe("POST /api/events/[id]/attendances", () => {
  it("records with the session user as recorder", async () => {
    const res = await post({ memberId: "alice", recordedBy: "forged" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, created: true });
    expect(mocks.recordAttendance).toHaveBeenCalledWith(
      "ev1",
      "alice",
      "admin-1",
    );
  });

  it.each(["not json", { memberId: "" }, { memberId: "a/b" }, {}])(
    "returns 400 for invalid body %j",
    async (body) => {
      expect((await post(body)).status).toBe(400);
      expect(mocks.recordAttendance).not.toHaveBeenCalled();
    },
  );

  it("maps a missing member to 404", async () => {
    mocks.recordAttendance.mockRejectedValue(
      new EventError(EVENT_ERROR_CODES.MEMBER_NOT_FOUND),
    );
    expect((await post({ memberId: "alice" })).status).toBe(404);
  });

  it("returns 500 on unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordAttendance.mockRejectedValue(new Error("boom"));
    expect((await post({ memberId: "alice" })).status).toBe(500);
  });
});

describe("DELETE /api/events/[id]/attendances/[memberId]", () => {
  it("removes the attendance", async () => {
    const res = await del();
    expect(await res.json()).toEqual({ ok: true, removed: true });
    expect(mocks.removeAttendance).toHaveBeenCalledWith("ev1", "alice");
  });

  it("maps a missing event to 404", async () => {
    mocks.removeAttendance.mockRejectedValue(
      new EventError(EVENT_ERROR_CODES.NOT_FOUND),
    );
    expect((await del()).status).toBe(404);
  });
});

describe("GET /api/events/[id]/attendances", () => {
  it("returns the attendance list", async () => {
    mocks.listAttendances.mockResolvedValue([
      { memberId: "alice", recordedBy: "admin-1", recordedAt: null },
    ]);
    const res = await get();
    expect((await res.json()).attendances).toHaveLength(1);
  });
});
