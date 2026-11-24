import { listFromLines } from "../views/utils/textUtils";
import type { CandidateContextForm } from "../../application/contracts/presenters/CandidateContextPresenterContract";
import type { OnboardingProgress } from "../../application/use-cases/onboardingUseCases";
import type { CandidateContextInput } from "../../domain/models/CandidateContext";
import type { User } from "../../domain/models/User";

export type OnboardingInput = CandidateContextForm & {
  arrangement: string;
  locations: string;
  cv?: { name: string; content: string };
};

type OnboardingControllerDependencies = {
  finishOnboarding(
    userId: string,
    input: CandidateContextInput,
    progress: OnboardingProgress,
  ): Promise<User>;
};

// Translate onboarding input and invoke the coordinated onboarding use case.
export class OnboardingController {
  constructor(
    private readonly dependencies: OnboardingControllerDependencies,
  ) {}

  // Require at least one target role before the user leaves the first step.
  validateRoles(roles: string) {
    return listFromLines(roles).length ? null : "Add at least one target role.";
  }

  // Validate all submitted roles and prepare the initial candidate context fields.
  finish(userId: string, input: OnboardingInput, progress: OnboardingProgress) {
    const error = this.validateRoles(input.roles);

    if (error) throw new Error(error);

    return this.dependencies.finishOnboarding(
      userId,
      {
        targetRoles: listFromLines(input.roles),
        preferences: [
          ...listFromLines(input.preferences),
          ...(input.arrangement.trim()
            ? [`Work arrangement: ${input.arrangement.trim()}`]
            : []),
          ...(input.locations.trim()
            ? [`Preferred locations: ${input.locations.trim()}`]
            : []),
        ],
        redFlags: listFromLines(input.redFlags),
        ...(input.cv
          ? { cvFile: input.cv.content, cvFileName: input.cv.name }
          : {}),
      },
      progress,
    );
  }
}
