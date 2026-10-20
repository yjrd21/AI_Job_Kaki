import type { CandidateContextRepositoryContract } from "../contracts/repositories/CandidateContextRepositoryContract";
import type { UserRepositoryContract } from "../contracts/repositories/UserRepositoryContract";
import type { CandidateContextInput } from "../../domain/models/CandidateContext";
import type { OnboardingProgressContract } from "../contracts/controllers/OnboardingControllerContract";

// Create the initial context before completing onboarding, retaining creation progress for retries.
export async function finishOnboarding(
  contexts: CandidateContextRepositoryContract,
  users: UserRepositoryContract,
  userId: string,
  input: CandidateContextInput,
  progress: OnboardingProgressContract,
) {
  if (!progress.contextId) {
    const context = await contexts.create(userId, input);
    progress.contextId = context.id;
  }

  return users.completeOnboarding(userId);
}
