import { z } from "zod";
import type {
  AccountControllerContract,
  AccountInputContract,
  AccountValidationContract,
} from "../../application/contracts/controllers/AccountControllerContract";
import type { User, UserUpdate } from "../../domain/models/User";

type AccountControllerDependencies = {
  completeOnboarding(userId: string): Promise<User>;
  getAccount(userId: string): Promise<User>;
  saveAccount(userId: string, update: UserUpdate): Promise<User>;
};

// Validate the account names and email before submitting an update.
const accountFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
});

// Implement account input validation and invoke the injected account operations.
export class AccountController implements AccountControllerContract {
  constructor(private readonly dependencies: AccountControllerDependencies) {}

  // Record account onboarding completion.
  completeOnboarding(userId: string) {
    return this.dependencies.completeOnboarding(userId);
  }

  // Retrieve account details.
  getAccount(userId: string) {
    return this.dependencies.getAccount(userId);
  }

  // Translate Zod validation results into library-independent field feedback.
  validateAccount(input: unknown): AccountValidationContract {
    // Validate the incoming values without throwing for field-level errors.
    const result = accountFormSchema.safeParse(input);

    if (result.success) return { valid: true, values: result.data };

    // Collect the first message for each field and any object-level error.
    const { fieldErrors, formErrors } = result.error.flatten();

    return {
      valid: false,
      errors: {
        firstName: fieldErrors.firstName?.[0],
        lastName: fieldErrors.lastName?.[0],
        email: fieldErrors.email?.[0],
      },
      formError: formErrors[0],
    };
  }

  // Validate and adapt account input before invoking the save operation.
  async saveAccount(userId: string, input: AccountInputContract) {
    // Parse again at the controller boundary so callers cannot bypass validation.
    const update = accountFormSchema.parse(input);

    return this.dependencies.saveAccount(userId, update);
  }
}
