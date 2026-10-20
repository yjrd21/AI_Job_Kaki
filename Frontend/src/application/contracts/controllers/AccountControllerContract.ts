import type { User } from "../../../domain/models/User";

// Describe the complete account form input accepted by the controller.
export interface AccountInputContract {
  firstName: string;
  lastName: string;
  email: string;
}

// Report validated values or field errors without exposing a validation library.
export type AccountValidationContract =
  | { valid: true; values: AccountInputContract }
  | {
      valid: false;
      errors: Partial<Record<keyof AccountInputContract, string>>;
      formError?: string;
    };

// Define account input handling and application access available to views.
export interface AccountControllerContract {
  completeOnboarding(userId: string): Promise<User>;
  getAccount(userId: string): Promise<User>;
  validateAccount(input: unknown): AccountValidationContract;
  saveAccount(userId: string, input: AccountInputContract): Promise<User>;
}
