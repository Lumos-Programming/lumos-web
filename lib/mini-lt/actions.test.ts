import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWeekEvent,
  syncWeekEventDescription,
  deleteWeekEvent,
} from "./actions/discord-events";
import { sendLineNextEvent } from "./actions/line";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getWeekData: vi.fn(),
  saveDiscordEvent: vi.fn(),
  removeDiscordEvent: vi.fn(),
  createDiscordEvent: vi.fn(),
  updateDiscordEvent: vi.fn(),
  deleteDiscordEvent: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/firebase", () => ({
  getWeekData: mocks.getWeekData,
  saveDiscordEvent: mocks.saveDiscordEvent,
  removeDiscordEvent: mocks.removeDiscordEvent,
}));
vi.mock("@/lib/discord", () => ({
  createDiscordEvent: mocks.createDiscordEvent,
  updateDiscordEvent: mocks.updateDiscordEvent,
  deleteDiscordEvent: mocks.deleteDiscordEvent,
  getDiscordEventUrl: (id: string) => `https://discord.test/${id}`,
}));
vi.mock("@/lib/mini-lt/line-flex", () => ({
  buildNextEventFlexMessage: () => ({ type: "flex" }),
}));

const weekId = "2026-W37";
const actions = [
  { name: "create", invoke: () => createWeekEvent(weekId) },
  { name: "sync", invoke: () => syncWeekEventDescription(weekId) },
  { name: "delete", invoke: () => deleteWeekEvent(weekId) },
  { name: "LINE", invoke: () => sendLineNextEvent() },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "test-token");
  vi.stubEnv("LINE_PUSH_TARGET_ID", "test-target");
  mocks.auth.mockResolvedValue({ user: { id: "admin", isAdmin: true } });
  mocks.getWeekData.mockResolvedValue({
    talks: [],
    discordEventId: "stored-event",
  });
  mocks.createDiscordEvent.mockResolvedValue({ id: "created-event" });
  mocks.fetch.mockResolvedValue({ ok: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe.each(actions)("$name authorization", ({ invoke }) => {
  it.each([
    { name: "anonymous", session: null },
    { name: "member", session: { user: { id: "member", isAdmin: false } } },
    { name: "missing ID", session: { user: { isAdmin: true } } },
    {
      name: "opted-out admin",
      session: { user: { id: "admin", isAdmin: true, optedOut: true } },
    },
  ])("rejects $name before any side effects", async ({ session }) => {
    mocks.auth.mockResolvedValue(session);
    await expect(invoke()).rejects.toThrow("管理者権限が必要です");
    for (const fn of [
      mocks.getWeekData,
      mocks.saveDiscordEvent,
      mocks.removeDiscordEvent,
      mocks.createDiscordEvent,
      mocks.updateDiscordEvent,
      mocks.deleteDiscordEvent,
      mocks.fetch,
    ])
      expect(fn).not.toHaveBeenCalled();
  });

  it("rechecks the session on each invocation", async () => {
    await invoke();
    mocks.auth.mockResolvedValue(null);
    await expect(invoke()).rejects.toThrow("管理者権限が必要です");
    expect(mocks.auth).toHaveBeenCalledTimes(2);
  });
});

it("creates and saves a Discord event for an admin", async () => {
  await createWeekEvent(weekId);
  expect(mocks.createDiscordEvent).toHaveBeenCalledTimes(1);
  expect(mocks.saveDiscordEvent).toHaveBeenCalledWith(
    weekId,
    "created-event",
    "https://discord.test/created-event",
  );
});

it("updates only the week's stored event", async () => {
  await syncWeekEventDescription(weekId);
  expect(mocks.updateDiscordEvent).toHaveBeenCalledWith(
    "stored-event",
    expect.objectContaining({ description: expect.any(String) }),
  );
});

it("deletes only the week's stored event", async () => {
  await deleteWeekEvent(weekId);
  expect(mocks.deleteDiscordEvent).toHaveBeenCalledWith("stored-event");
  expect(mocks.removeDiscordEvent).toHaveBeenCalledWith(weekId);
});

it("sends the LINE notification for an admin", async () => {
  await sendLineNextEvent();
  expect(mocks.fetch).toHaveBeenCalledWith(
    "https://api.line.me/v2/bot/message/push",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        to: "test-target",
        messages: [{ type: "flex" }],
      }),
    }),
  );
});

it.each([syncWeekEventDescription, deleteWeekEvent])(
  "rejects a week without a stored event",
  async (action) => {
    mocks.getWeekData.mockResolvedValue({ talks: [] });
    await expect(action(weekId)).rejects.toThrow("Discord event not found");
    expect(mocks.updateDiscordEvent).not.toHaveBeenCalled();
    expect(mocks.deleteDiscordEvent).not.toHaveBeenCalled();
    expect(mocks.removeDiscordEvent).not.toHaveBeenCalled();
  },
);

it.each([createWeekEvent, syncWeekEventDescription, deleteWeekEvent])(
  "rejects an invalid week before accessing data",
  async (action) => {
    await expect(action("invalid-week")).rejects.toThrow("Invalid week ID");
    expect(mocks.getWeekData).not.toHaveBeenCalled();
  },
);
