import type { JobController } from "./JobController";
import type {
  JobAnalysisPresentation,
  JobPresentation,
} from "../presenters/JobPresenter";
import type { ResultPresenter } from "../presenters/ResultPresenter";
import type { JobSubmission } from "../../domain/models/Job";

const POLL_INTERVAL_MS = 2500;

export class ResultController {
  private readonly pollTimers = new WeakMap<
    ResultPresenter,
    ReturnType<typeof setTimeout>
  >();
  private readonly lastStatus = new WeakMap<
    ResultPresenter,
    JobSubmission["status"]
  >();

  constructor(
    private readonly jobController: JobController<
      JobPresentation,
      JobAnalysisPresentation
    >,
  ) {}

  start(userId: string | null, jobId: string, presenter: ResultPresenter) {
    this.stopPolling(presenter);
    this.lastStatus.delete(presenter);
    presenter.reset();
    void this.refreshJob(userId, jobId, presenter);
    return () => {
      this.stopPolling(presenter);
      presenter.cancelRequests();
    };
  }

  async refreshJob(
    userId: string | null,
    jobId: string,
    presenter: ResultPresenter,
  ) {
    this.stopPolling(presenter);
    const request = presenter.beginJobLoad();
    let job: JobPresentation;
    try {
      if (!userId || !jobId) {
        throw new Error("A user and job ID are required to load a job.");
      }
      job = await this.jobController.getJob(userId, jobId);
    } catch (error) {
      const current = presenter.presentJobFailure(request, error);
      const status = this.lastStatus.get(presenter);
      if (current && (status === "PENDING" || status === "PROCESSING")) {
        this.schedulePoll(userId, jobId, presenter);
      }
      return;
    }

    if (!presenter.presentJob(request, job)) return;
    this.lastStatus.set(presenter, job.status);
    if (job.presentation.state === "completed" && job.jobAnalysisId) {
      await this.loadAnalysis(job.jobAnalysisId, presenter);
      return;
    }
    presenter.presentResultUnavailable();

    if (job.status === "PENDING" || job.status === "PROCESSING") {
      this.schedulePoll(userId, jobId, presenter);
    }
  }

  async refreshAnalysis(
    presenter: ResultPresenter,
    analysisId: string | null | undefined,
  ) {
    if (!analysisId) {
      presenter.presentResultUnavailable();
      return;
    }
    await this.loadAnalysis(analysisId, presenter);
  }

  async deleteJob(
    userId: string | null,
    jobId: string,
    presenter: ResultPresenter,
  ) {
    const request = presenter.beginDelete();
    try {
      if (!userId) {
        throw new Error("Deleting a job requires an authenticated user.");
      }
      await this.jobController.deleteJob(userId, jobId);
      return presenter.presentDeleteSuccess(request);
    } catch (error) {
      presenter.presentDeleteFailure(request, error);
      return false;
    }
  }

  private async loadAnalysis(analysisId: string, presenter: ResultPresenter) {
    const request = presenter.beginResultLoad();
    try {
      presenter.presentResult(
        request,
        await this.jobController.getAnalysis(analysisId),
      );
    } catch (error) {
      presenter.presentResultFailure(request, error);
    }
  }

  private stopPolling(presenter: ResultPresenter) {
    const timer = this.pollTimers.get(presenter);
    if (timer) clearTimeout(timer);
    this.pollTimers.delete(presenter);
  }

  private schedulePoll(
    userId: string | null,
    jobId: string,
    presenter: ResultPresenter,
  ) {
    this.pollTimers.set(
      presenter,
      setTimeout(
        () => void this.refreshJob(userId, jobId, presenter),
        POLL_INTERVAL_MS,
      ),
    );
  }
}
