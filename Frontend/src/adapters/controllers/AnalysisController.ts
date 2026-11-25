import type { CandidateContextController } from "./CandidateContextController";
import type { JobController } from "./JobController";
import type {
  JobAnalysisPresentation,
  JobPresentation,
} from "../presenters/JobPresenter";
import type {
  PrimaryContextPresentation,
  ProfilePresentation,
} from "../presenters/CandidateContextPresenter";
import type { AnalysisPresenter } from "../presenters/AnalysisPresenter";
import type { JobInput } from "./JobController";

export class AnalysisController {
  constructor(
    private readonly jobController: JobController<
      JobPresentation,
      JobAnalysisPresentation
    >,
    private readonly candidateContextController: CandidateContextController<
      PrimaryContextPresentation,
      ProfilePresentation[]
    >,
  ) {}

  validateJob(input: unknown) {
    return this.jobController.validateJob(input);
  }

  resolveJobForm(values: unknown, presenter: AnalysisPresenter) {
    return presenter.toResolverResult(
      presenter.presentValidation(this.validateJob(values)),
    );
  }

  loadProfiles(userId: string | null, presenter: AnalysisPresenter) {
    const output = presenter.beginProfileRequest();
    if (!userId) {
      output.presentFailure();
      return;
    }
    const load = async () => {
      let contexts;
      try {
        contexts = await this.candidateContextController.listContexts(userId);
      } catch {
        output.presentFailure();
        return;
      }
      output.presentContexts(contexts);
    };
    return load();
  }

  async submitJob(
    userId: string | null,
    input: JobInput,
    presenter: AnalysisPresenter,
  ): Promise<JobPresentation | undefined> {
    const request = presenter.beginSubmission();
    try {
      if (!userId) {
        throw new Error("Job submission requires an authenticated user.");
      }
      const job = await this.jobController.submitJob(userId, input);
      if (!presenter.presentSubmissionSuccess(request)) return undefined;
      return job;
    } catch (error) {
      presenter.presentSubmissionFailure(request, error);
      return undefined;
    }
  }
}
