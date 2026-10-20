import { listFromLines } from "../views/utils/textUtils";
import type { ApplicationContract } from "../../application/contracts/ApplicationContract";
import type {
  OnboardingControllerContract,
  OnboardingInputContract,
  OnboardingProgressContract,
} from "../../application/contracts/controllers/OnboardingControllerContract";

// Translate onboarding input and invoke the coordinated application workflow.
export class OnboardingController implements OnboardingControllerContract {
  // Receive the coordinated onboarding API without constructing its dependencies.
  constructor(
    private readonly application: Pick<ApplicationContract, "onboarding">,
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

    return this.application.onboarding.finish(
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
