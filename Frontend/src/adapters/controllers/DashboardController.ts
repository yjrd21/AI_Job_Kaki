import type { CandidateContext } from "../../domain/models/CandidateContext";
import type { DashboardPresenter } from "../presenters/DashboardPresenter";
import type { JobPresentation } from "../presenters/JobPresenter";
import type { PrimaryContextPresentation } from "../presenters/CandidateContextPresenter";

type DashboardControllerDependencies = {
  listContexts(userId: string): Promise<CandidateContext[]>;
  getPrimaryContext(contexts: CandidateContext[]): PrimaryContextPresentation;
  listJobs(userId: string): Promise<JobPresentation[]>;
};

// Expose the dashboard's use-case operations through one page-level controller.
export class DashboardController {
  constructor(private readonly dependencies: DashboardControllerDependencies) {}

  refreshDashboard(userId: string, presenter: DashboardPresenter) {
    presenter.reset();
    void this.loadPrimaryContext(userId, presenter);
    void this.loadRecentAnalysis(userId, presenter);
    return () => presenter.cancelRequests();
  }

  async loadPrimaryContext(userId: string, presenter: DashboardPresenter) {
    const request = presenter.beginPrimaryRequest();
    let contexts: CandidateContext[];
    try {
      contexts = await this.dependencies.listContexts(userId);
    } catch (error) {
      presenter.presentPrimaryFailure(request, error);
      return;
    }

    presenter.presentPrimaryContext(
      request,
      this.dependencies.getPrimaryContext(contexts),
    );
  }

  async loadRecentAnalysis(userId: string, presenter: DashboardPresenter) {
    const request = presenter.beginRecentAnalysisRequest();
    let jobs: JobPresentation[];
    try {
      jobs = await this.dependencies.listJobs(userId);
    } catch (error) {
      presenter.presentRecentAnalysisFailure(request, error);
      return;
    }

    presenter.presentRecentAnalysis(request, jobs);
  }
}
