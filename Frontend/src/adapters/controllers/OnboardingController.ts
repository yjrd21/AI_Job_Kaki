import { listFromLines } from "../views/utils/textUtils";
import type {
  OnboardingControllerContract,
  OnboardingInputContract,
  OnboardingProgressContract,
} from "../../application/contracts/controllers/OnboardingControllerContract";
import type { CandidateContextInput } from "../../domain/models/CandidateContext";
import type { User } from "../../domain/models/User";

type OnboardingControllerDependencies = {
  finishOnboarding(
    userId: string,
    input: CandidateContextInput,
    progress: OnboardingProgressContract,
  ): Promise<User>;
};

// Translate onboarding input and invoke the coordinated onboarding use case.
export class OnboardingController implements OnboardingControllerContract {
  constructor(
    private readonly dependencies: OnboardingControllerDependencies,
  ) {}

  // Require at least one target role before the user leaves the first step.
  validateRoles(roles: string) {
    return listFromLines(roles).length ? null : "Add at least one target role.";
  }

  // Validate all submitted roles and prepare the initial candidate context fields.
  finish(
    userId: string,
    input: OnboardingInputContract,
    progress: OnboardingProgressContract,
  ) {
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
