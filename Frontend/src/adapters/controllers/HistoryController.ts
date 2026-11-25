import type { JobController } from "./JobController";
import type {
  JobAnalysisPresentation,
  JobPresentation,
} from "../presenters/JobPresenter";
import type { HistoryPresenter } from "../presenters/HistoryPresenter";

export class HistoryController {
  constructor(
    private readonly jobController: JobController<
      JobPresentation,
      JobAnalysisPresentation
    >,
  ) {}

  async loadJobs(userId: string | null, presenter: HistoryPresenter) {
    const request = presenter.beginLoad();
    try {
      if (!userId) {
        throw new Error("Job history requires an authenticated user.");
      }
      presenter.presentJobs(request, await this.jobController.listJobs(userId));
    } catch (error) {
      presenter.presentLoadFailure(request, error);
    }
  }

  async deleteJob(
    userId: string | null,
    jobId: string,
    presenter: HistoryPresenter,
  ) {
    const request = presenter.beginDelete();
    try {
      if (!userId) {
        throw new Error("Deleting a job requires an authenticated user.");
      }
      await this.jobController.deleteJob(userId, jobId);
      if (!presenter.presentDeleteSuccess(request)) return;
      await this.loadJobs(userId, presenter);
    } catch (error) {
      presenter.presentDeleteFailure(request, error);
    }
  }
}
