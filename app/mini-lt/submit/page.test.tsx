import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import SubmitPage from "./page";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getWeekData: vi.fn(),
  addTalk: vi.fn(),
  updateTalk: vi.fn(),
  deleteTalk: vi.fn(),
  createWeekEvent: vi.fn(),
  syncWeekEventDescription: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  isValidSnowflake: () => true,
}));
vi.mock("@/lib/firebase", () => ({
  getWeekData: mocks.getWeekData,
  addTalk: mocks.addTalk,
  updateTalk: mocks.updateTalk,
  deleteTalk: mocks.deleteTalk,
}));
vi.mock("@/lib/mini-lt/discord-events", () => ({
  createWeekEvent: mocks.createWeekEvent,
  syncWeekEventDescription: mocks.syncWeekEventDescription,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/image", () => ({ default: "img" }));
vi.mock("@/components/mini-lt/WeekNavigator", () => ({ WeekNavigator: "nav" }));
vi.mock("@/components/mini-lt/ManageTalks", () => ({
  ManageTalks: "mock-talks",
}));
vi.mock("@/components/mini-lt/Header", () => ({ Header: "header" }));
vi.mock("@/components/mini-lt/ui", () => ({ Button: "button" }));

type TalkForm = {
  title: string;
  description: string;
  duration: number;
  id?: string;
};
type TalkActions = {
  onAction: (form: TalkForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function findActions(node: ReactNode): TalkActions | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Partial<TalkActions> & { children?: ReactNode }>(child))
      continue;
    if (child.props.onAction && child.props.onDelete) {
      return { onAction: child.props.onAction, onDelete: child.props.onDelete };
    }
    const found = findActions(child.props.children);
    if (found) return found;
  }
}

const weekId = "2026-W37";
const form = { title: "Talk", description: "Description", duration: 5 };
async function renderActions() {
  const page = await SubmitPage({
    searchParams: Promise.resolve({ week: weekId }),
  });
  const actions = findActions(page);
  if (!actions) throw new Error("Talk actions not rendered");
  return actions;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({
    user: { id: "member", name: "Member", image: "", isAdmin: false },
  });
  mocks.getWeekData.mockResolvedValue({ talks: [], discordEventId: "event" });
});

it("preserves member talk creation and automatic event creation", async () => {
  const actions = await renderActions();
  mocks.getWeekData.mockResolvedValueOnce({ talks: [] }).mockResolvedValueOnce({
    talks: [{ presenterUid: "member" }],
  });
  await actions.onAction(form);
  expect(mocks.addTalk).toHaveBeenCalledWith(
    weekId,
    expect.objectContaining(form),
    "member",
  );
  expect(mocks.createWeekEvent).toHaveBeenCalledWith(weekId);
});

it("preserves member talk editing and automatic synchronization", async () => {
  const actions = await renderActions();
  await actions.onAction({ ...form, id: "talk" });
  expect(mocks.updateTalk).toHaveBeenCalledWith(weekId, "talk", form, "member");
  expect(mocks.syncWeekEventDescription).toHaveBeenCalledWith(weekId);
});

it("preserves member talk deletion and automatic synchronization", async () => {
  const actions = await renderActions();
  await actions.onDelete("talk");
  expect(mocks.deleteTalk).toHaveBeenCalledWith(weekId, "talk", "member");
  expect(mocks.syncWeekEventDescription).toHaveBeenCalledWith(weekId);
});

it.each([null, { user: { id: "member", optedOut: true } }])(
  "rechecks the session before talk mutations",
  async (session) => {
    const actions = await renderActions();
    mocks.auth.mockResolvedValue(session);
    await expect(actions.onAction(form)).rejects.toThrow();
    await expect(actions.onDelete("talk")).rejects.toThrow();
    expect(mocks.addTalk).not.toHaveBeenCalled();
    expect(mocks.deleteTalk).not.toHaveBeenCalled();
    expect(mocks.createWeekEvent).not.toHaveBeenCalled();
    expect(mocks.syncWeekEventDescription).not.toHaveBeenCalled();
  },
);

it("does not synchronize when ownership validation rejects a mutation", async () => {
  const actions = await renderActions();
  mocks.updateTalk.mockRejectedValue(new Error("Not owner"));
  mocks.deleteTalk.mockRejectedValue(new Error("Not owner"));
  await expect(actions.onAction({ ...form, id: "other-talk" })).rejects.toThrow(
    "Not owner",
  );
  await expect(actions.onDelete("other-talk")).rejects.toThrow("Not owner");
  expect(mocks.syncWeekEventDescription).not.toHaveBeenCalled();
});
