import { describe, expect, it, vi } from "vitest";
import { finishOnboarding } from "../../../src/application/use-cases/onboardingUseCases";
import { account, profile } from "../../fixtures/application";

function setup() {
  const contexts = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn().mockResolvedValue(profile),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const users = {
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    completeOnboarding: vi
      .fn()
      .mockResolvedValue({ ...account, onboardingCompleted: true }),
  };
  const progress = { contextId: null as string | null };
  const input = { targetRoles: ["Engineer"], preferences: [], redFlags: [] };
  return { contexts, users, progress, input };
}

describe("onboarding workflow", () => {
  it("creates the profile before marking the account complete", async () => {
    const { contexts, users, progress, input } = setup();
    users.completeOnboarding.mockImplementation(async () => {
      expect(progress.contextId).toBe(profile.id);
      expect(contexts.create).toHaveBeenCalledExactlyOnceWith("user-id", input);
      return { ...account, onboardingCompleted: true };
    });
    expect(
      await finishOnboarding(contexts, users, "user-id", input, progress),
    ).toMatchObject({ onboardingCompleted: true });
  });

  it("retries completion without duplicating a successfully created profile", async () => {
    const { contexts, users, progress, input } = setup();
    users.completeOnboarding.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(
      finishOnboarding(contexts, users, "user-id", input, progress),
    ).rejects.toThrow("Unavailable");
    await finishOnboarding(contexts, users, "user-id", input, progress);
    expect(contexts.create).toHaveBeenCalledTimes(1);
    expect(users.completeOnboarding).toHaveBeenCalledTimes(2);
  });

  it("does not complete onboarding or advance progress when creation fails", async () => {
    const { contexts, users, progress, input } = setup();
    contexts.create.mockRejectedValue(new Error("Creation failed"));
    await expect(
      finishOnboarding(contexts, users, "user-id", input, progress),
    ).rejects.toThrow("Creation failed");
    expect(users.completeOnboarding).not.toHaveBeenCalled();
    expect(progress.contextId).toBeNull();
  });
});
