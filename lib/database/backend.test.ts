import { afterEach, describe, expect, it, vi } from "vitest";

const factories = vi.hoisted(() => ({
  firestore: vi.fn(() => ({ name: "firestore" })),
  cloudflare: vi.fn(async () => ({ env: { DB: {} } })),
}));
vi.mock("./firestore", () => ({ createFirestoreBackend: factories.firestore }));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: factories.cloudflare,
}));

import { createBackend } from "./backend";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("runtime backend isolation", () => {
  it("opens Firestore without asking for any Cloudflare context", async () => {
    vi.stubEnv("DATABASE_MIGRATION_STAGE", undefined);
    await createBackend("firestore");
    expect(factories.firestore).toHaveBeenCalledOnce();
    expect(factories.cloudflare).not.toHaveBeenCalled();
  });

  it.each(["firestore-only", "firestore-primary", "d1-primary"])(
    "rejects %s on Workers before a backend can write",
    async (stage) => {
      vi.stubEnv("DATABASE_MIGRATION_STAGE", stage);
      vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
      await expect(createBackend("d1")).rejects.toThrow("Workers requires");
      expect(factories.firestore).not.toHaveBeenCalled();
      expect(factories.cloudflare).not.toHaveBeenCalled();
    },
  );

  it("uses the request binding on D1-only Workers without initializing Firestore", async () => {
    vi.stubEnv("DATABASE_MIGRATION_STAGE", "d1-only");
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    expect((await createBackend("d1")).name).toBe("d1");
    expect(factories.cloudflare).toHaveBeenCalledOnce();
    expect(factories.firestore).not.toHaveBeenCalled();
  });
});
