import { describe, expect, it, vi } from "vitest";
import { AccountController } from "../../../src/adapters/controllers/AccountController";
import type { AccountControllerContract } from "../../../src/application/contracts/controllers/AccountControllerContract";
import { account } from "../../fixtures/application";

function setup() {
  const accountApi = {
    get: vi.fn().mockResolvedValue(account),
    save: vi.fn().mockResolvedValue(account),
    completeOnboarding: vi.fn().mockResolvedValue(account),
  };
  const controller: AccountControllerContract = new AccountController({
    account: accountApi,
  });
  return { controller, accountApi };
}
const input = {
  firstName: "First",
  lastName: "Last",
  email: "candidate@example.com",
};

describe("AccountController", () => {
  it("returns plain validation feedback without invoking application operations", () => {
    const { controller, accountApi } = setup();
    expect(
      controller.validateAccount({
        firstName: "",
        lastName: "",
        email: "invalid",
      }),
    ).toEqual({
      valid: false,
      errors: {
        firstName: "First name is required",
        lastName: "Last name is required",
        email: "Enter a valid email",
      },
      formError: undefined,
    });
    expect(accountApi.save).not.toHaveBeenCalled();
    expect(controller.validateAccount(input)).toEqual({
      valid: true,
      values: input,
    });
  });

  it("reports malformed input through the validation contract", () => {
    const { controller } = setup();
    expect(controller.validateAccount(null)).toMatchObject({
      valid: false,
      formError: expect.any(String),
    });
  });

  it("rejects invalid direct saves before they reach the application API", async () => {
    const { controller, accountApi } = setup();
    await expect(
      controller.saveAccount("user-id", { ...input, email: "invalid" }),
    ).rejects.toThrow();
    expect(accountApi.save).not.toHaveBeenCalled();
  });

  it("passes only validated account fields to the application and returns its result", async () => {
    const { controller, accountApi } = setup();
    const submitted = { ...input, onboardingCompleted: true };
    expect(await controller.saveAccount("user-id", submitted)).toBe(account);
    expect(accountApi.save).toHaveBeenCalledExactlyOnceWith("user-id", input);
    expect(await controller.getAccount("user-id")).toBe(account);
    expect(accountApi.get).toHaveBeenCalledWith("user-id");
  });
});
