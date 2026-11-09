import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_ERROR_CODES, EventError } from "@/types/event";
import type { SurveyDefinition } from "@/types/survey";
import { GET, PUT } from "./route";
import { GET as GET_RESPONSE, PUT as PUT_RESPONSE } from "./response/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getEvent: vi.fn(),
  listSurveyResponses: vi.fn(),
  setEventSurvey: vi.fn(),
  getSurveyResponse: vi.fn(),
  submitSurveyResponse: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/events", () => ({ getEvent: mocks.getEvent }));
vi.mock("@/lib/survey", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/survey")>();
  return {
    parseSurveyBody: actual.parseSurveyBody,
    parseSurveyAnswerBody: actual.parseSurveyAnswerBody,
    listSurveyResponses: mocks.listSurveyResponses,
    setEventSurvey: mocks.setEventSurvey,
    getSurveyResponse: mocks.getSurveyResponse,
    submitSurveyResponse: mocks.submitSurveyResponse,
  };
});

const SURVEY: SurveyDefinition = {
  questions: [{ id: "q1", type: "rating", label: "期待度", required: true }],
};
const ADMIN = { user: { id: "admin-1", isAdmin: true } };
const MEMBER = { user: { id: "alice" } };
const params = () => ({ params: Promise.resolve({ id: "ev1" }) });
const req = (body?: unknown) =>
  new Request("https://example.test", {
    method: "PUT",
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });

const adminGet = () => GET(req(), params());
const adminPut = (body: unknown = { survey: SURVEY }) =>
  PUT(req(body), params());
const memberGet = () => GET_RESPONSE(req(), params());
const memberPut = (body: unknown = { answers: { q1: 3 } }) =>
  PUT_RESPONSE(req(body), params());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue(ADMIN);
  mocks.getEvent.mockResolvedValue({ id: "ev1", survey: SURVEY });
  mocks.listSurveyResponses.mockResolvedValue([]);
  mocks.setEventSurvey.mockResolvedValue(undefined);
  mocks.getSurveyResponse.mockResolvedValue(null);
  mocks.submitSurveyResponse.mockResolvedValue({ created: true });
});

describe.each([
  { name: "GET survey", call: adminGet },
  { name: "PUT survey", call: () => adminPut() },
])("$name authorization (admin only)", ({ call }) => {
  it("returns 401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it.each([
    { name: "non-admin member", session: MEMBER },
    {
      name: "opted-out admin",
      session: { user: { id: "u1", isAdmin: true, optedOut: true } },
    },
  ])("returns 403 for $name", async ({ session }) => {
    mocks.auth.mockResolvedValue(session);
    expect((await call()).status).toBe(403);
    expect(mocks.setEventSurvey).not.toHaveBeenCalled();
    expect(mocks.listSurveyResponses).not.toHaveBeenCalled();
  });
});

describe.each([
  { name: "GET response", call: memberGet },
  { name: "PUT response", call: () => memberPut() },
])("$name authorization (members)", ({ call }) => {
  it("returns 401 without a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });

  it.each([
    {
      name: "opted-out member",
      session: { user: { id: "u1", optedOut: true } },
    },
    {
      name: "opted-out admin",
      session: { user: { id: "u1", isAdmin: true, optedOut: true } },
    },
  ])("returns 403 for $name", async ({ session }) => {
    mocks.auth.mockResolvedValue(session);
    expect((await call()).status).toBe(403);
    expect(mocks.submitSurveyResponse).not.toHaveBeenCalled();
    expect(mocks.getSurveyResponse).not.toHaveBeenCalled();
  });
});

describe("GET /api/events/[id]/survey", () => {
  it("returns responses and summary", async () => {
    mocks.listSurveyResponses.mockResolvedValue([
      { memberId: "a", answers: { q1: 4 }, submittedAt: null, updatedAt: null },
      { memberId: "b", answers: { q1: 2 }, submittedAt: null, updatedAt: null },
    ]);
    const data = await (await adminGet()).json();
    expect(data.responses).toHaveLength(2);
    expect(data.summary[0]).toMatchObject({ answeredCount: 2, average: 3 });
  });

  it("returns 404 for a missing event", async () => {
    mocks.getEvent.mockResolvedValue(null);
    expect((await adminGet()).status).toBe(404);
  });
});

describe("PUT /api/events/[id]/survey", () => {
  it("saves the survey", async () => {
    expect((await adminPut()).status).toBe(200);
    expect(mocks.setEventSurvey).toHaveBeenCalledWith("ev1", SURVEY);
  });

  it("accepts null to remove the survey", async () => {
    expect((await adminPut({ survey: null })).status).toBe(200);
    expect(mocks.setEventSurvey).toHaveBeenCalledWith("ev1", null);
  });

  it.each(["not json", {}, { survey: { questions: [] } }])(
    "returns 400 for %j",
    async (body) => {
      expect((await adminPut(body)).status).toBe(400);
      expect(mocks.setEventSurvey).not.toHaveBeenCalled();
    },
  );

  it("returns 409 with the reason on a change conflict", async () => {
    mocks.setEventSurvey.mockRejectedValue(
      new EventError(
        EVENT_ERROR_CODES.SURVEY_CHANGE_CONFLICT,
        "「期待度」には回答があるため削除できません",
      ),
    );
    const res = await adminPut();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(
      "「期待度」には回答があるため削除できません",
    );
  });
});

describe("PUT /api/events/[id]/survey/response", () => {
  it("answers as the session user (not a member ID in the body)", async () => {
    mocks.auth.mockResolvedValue(MEMBER);
    const res = await memberPut({ answers: { q1: 3 } });
    expect(await res.json()).toEqual({ ok: true, created: true });
    expect(mocks.submitSurveyResponse).toHaveBeenCalledWith("ev1", "alice", {
      q1: 3,
    });
  });

  it.each(["not json", {}, { answers: { q1: 3 }, memberId: "bob" }])(
    "returns 400 for %j",
    async (body) => {
      mocks.auth.mockResolvedValue(MEMBER);
      expect((await memberPut(body)).status).toBe(400);
      expect(mocks.submitSurveyResponse).not.toHaveBeenCalled();
    },
  );

  it.each([
    { code: EVENT_ERROR_CODES.SURVEY_CLOSED, status: 409 },
    { code: EVENT_ERROR_CODES.SURVEY_NOT_FOUND, status: 404 },
    { code: EVENT_ERROR_CODES.INVALID_SURVEY_ANSWER, status: 400 },
    { code: EVENT_ERROR_CODES.MEMBER_NOT_FOUND, status: 404 },
  ])("maps $code to $status", async ({ code, status }) => {
    mocks.auth.mockResolvedValue(MEMBER);
    mocks.submitSurveyResponse.mockRejectedValue(new EventError(code));
    expect((await memberPut()).status).toBe(status);
  });
});

describe("GET /api/events/[id]/survey/response", () => {
  it("returns only the session user's response", async () => {
    mocks.auth.mockResolvedValue(MEMBER);
    mocks.getSurveyResponse.mockResolvedValue({
      memberId: "alice",
      answers: { q1: 5 },
      submittedAt: null,
      updatedAt: null,
    });
    const data = await (await memberGet()).json();
    expect(data.response.answers).toEqual({ q1: 5 });
    expect(mocks.getSurveyResponse).toHaveBeenCalledWith("ev1", "alice");
  });
});
