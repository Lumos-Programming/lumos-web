import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  updateMemberSns: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/members", () => ({
  updateMemberSns: mocks.updateMemberSns,
  deleteMemberSnsField: vi.fn(),
}));

function put(body: unknown) {
  return PUT(
    new Request("https://example.test/api/settings/sns", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "session-member" } });
});

describe("PUT /api/settings/sns", () => {
  it("does not let clients overwrite OAuth-managed fields", async () => {
    const res = await put({
      github: "someone-else",
      githubId: "12345",
      x: "x-name",
      xId: "x-id",
      line: "line-name",
      lineId: "line-id",
    });
    expect(res.status).toBe(200);
    expect(mocks.updateMemberSns).toHaveBeenCalledExactlyOnceWith(
      "session-member",
      {},
    );
  });

  it("still accepts a LinkedIn URL", async () => {
    await put({
      linkedin: "https://www.linkedin.com/in/example",
      githubId: "12345",
    });
    const [, data] = mocks.updateMemberSns.mock.calls[0];
    expect(Object.keys(data)).toEqual(["linkedin"]);
  });

  it("rejects unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await put({ linkedin: "https://www.linkedin.com/in/x" });
    expect(res.status).toBe(401);
    expect(mocks.updateMemberSns).not.toHaveBeenCalled();
  });
});
