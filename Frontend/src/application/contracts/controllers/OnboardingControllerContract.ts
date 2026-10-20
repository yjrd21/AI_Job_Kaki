import type { CandidateContextFormContract } from "./CandidateContextControllerContract";
import type { User } from "../../../domain/models/User";

// Describe the fields and encoded CV accepted by the onboarding controller.
export interface OnboardingInputContract extends CandidateContextFormContract {
  arrangement: string;
  locations: string;
  cv?: { name: string; content: string };
}

// Retain successful profile creation across completion retries for one onboarding attempt.
export interface OnboardingProgressContract {
  contextId: string | null;
}

// Define onboarding input handling and application workflow access.
export interface OnboardingControllerContract {
  validateRoles(roles: string): string | null;
  finish(
    userId: string,
    input: OnboardingInputContract,
    progress: OnboardingProgressContract,
  ): Promise<User>;
}
