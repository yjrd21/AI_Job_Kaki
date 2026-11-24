import { listFromLines } from "../views/utils/textUtils";
import { fileToBase64, MAX_CV_BYTES } from "../views/utils/fileUtils";
import type { CandidateContextForm } from "../../application/contracts/presenters/CandidateContextPresenterContract";
import type { OnboardingProgress } from "../../application/use-cases/onboardingUseCases";
import type { CandidateContextInput } from "../../domain/models/CandidateContext";
import type { User } from "../../domain/models/User";
import type { OnboardingPresenter } from "../presenters/OnboardingPresenter";

export type OnboardingInput = CandidateContextForm & {
  arrangement: string;
  locations: string;
  cv?: { name: string; content: string };
};

type OnboardingControllerDependencies = {
  getAccount(userId: string): Promise<User>;
  finishOnboarding(
    userId: string,
    input: CandidateContextInput,
    progress: OnboardingProgress,
  ): Promise<User>;
};

// Translate onboarding input and invoke the coordinated onboarding use case.
export class OnboardingController {
  private readonly progress = new WeakMap<
    OnboardingPresenter,
    { session: number; progress: OnboardingProgress }
  >();

  constructor(
    private readonly dependencies: OnboardingControllerDependencies,
  ) {}

  startOnboarding(userId: string | null, presenter: OnboardingPresenter) {
    presenter.reset();
    if (!userId) return () => presenter.cancelAccountRequest();
    return this.loadOnboardingStatus(userId, presenter);
  }

  loadOnboardingStatus(userId: string, presenter: OnboardingPresenter) {
    const request = presenter.beginAccountRequest();
    const load = async () => {
      let account: User;
      try {
        account = await this.dependencies.getAccount(userId);
      } catch (error) {
        presenter.presentAccountFailure(request, error);
        return;
      }
      presenter.presentAccount(request, account);
    };
    void load();
    return () => presenter.cancelAccountRequest();
  }

  // Require at least one target role before the user leaves the first step.
  validateRoles(roles: string) {
    return listFromLines(roles).length ? null : "Add at least one target role.";
  }

  updateField(
    presenter: OnboardingPresenter,
    key: keyof Omit<OnboardingInput, "cv">,
    value: string,
  ) {
    presenter.presentField(key, value);
  }

  async chooseCv(presenter: OnboardingPresenter, file: File | undefined) {
    const selection = presenter.beginCvSelection();
    if (!file) return;
    if (file.size > MAX_CV_BYTES || !/\.(pdf|docx)$/i.test(file.name)) {
      presenter.presentCvFailure(
        selection,
        "Choose a PDF or DOCX file under 5 MB.",
      );
      return;
    }

    presenter.presentCvLoading(selection);
    try {
      const content = await fileToBase64(file);
      presenter.presentCv(selection, { name: file.name, content });
    } catch (error) {
      presenter.presentCvFailure(
        selection,
        error instanceof Error
          ? error.message
          : "Unable to read the CV. Please try again.",
      );
    }
  }

  previous(presenter: OnboardingPresenter) {
    presenter.presentStep(Math.max(0, presenter.getSnapshot().step - 1));
  }

  async next(
    userId: string | null,
    presenter: OnboardingPresenter,
    refresh: { onSuccess(): void; onSettled(): void },
  ) {
    if (!userId) throw new Error("Onboarding requires a user ID");
    const state = presenter.getSnapshot();
    if (state.submitting || state.cvLoading) return;
    presenter.presentError(null);
    const validation = this.validateRoles(state.values.roles);
    if (validation) {
      presenter.presentError(validation);
      return;
    }
    if (state.step < state.steps.length - 1) {
      presenter.presentStep(state.step + 1);
      return;
    }

    presenter.presentSubmitting();
    const session = presenter.getSession();
    let entry = this.progress.get(presenter);
    if (!entry || entry.session !== session) {
      entry = { session, progress: { contextId: null } };
      this.progress.set(presenter, entry);
    }
    try {
      await this.finish(
        userId,
        { ...state.values, ...(state.cv ? { cv: state.cv } : {}) },
        entry.progress,
      );
      presenter.presentCompletion(session);
    } catch (error) {
      presenter.presentSubmissionFailure(session, error);
      refresh.onSettled();
      return;
    }
    try {
      refresh.onSuccess();
    } finally {
      refresh.onSettled();
    }
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
