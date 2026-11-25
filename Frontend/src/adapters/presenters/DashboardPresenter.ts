import type { JobPresentation } from "./JobPresenter";
import type { PrimaryContextPresentation } from "./CandidateContextPresenter";

export type DashboardSection<T> =
  | { state: "loading" }
  | { state: "error"; error: unknown }
  | { state: "ready"; data: T };

export type RecentAnalysisPresentation = {
  heading: string;
  status: JobPresentation["status"];
  submittedAt: string;
  href: string;
};

export type RecentAnalysisView =
  | { state: "loading" }
  | { state: "error"; error: unknown }
  | { state: "empty" }
  | ({ state: "ready" } & RecentAnalysisPresentation);

export type DashboardViewState = {
  primaryContext: DashboardSection<PrimaryContextPresentation>;
  recentAnalysis: RecentAnalysisView;
};

function initialState(): DashboardViewState {
  return {
    primaryContext: { state: "loading" },
    recentAnalysis: { state: "loading" },
  };
}

// Keep dashboard display state and prepare recent-analysis output for the page.
export class DashboardPresenter {
  private primaryRequest = 0;
  private recentAnalysisRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): DashboardViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.primaryRequest++;
    this.recentAnalysisRequest++;
    this.state = initialState();
    this.notify();
  }

  cancelRequests() {
    this.primaryRequest++;
    this.recentAnalysisRequest++;
  }

  beginPrimaryRequest() {
    const request = ++this.primaryRequest;
    this.publish({ primaryContext: { state: "loading" } });
    return request;
  }

  presentPrimaryContext(request: number, data: PrimaryContextPresentation) {
    if (request !== this.primaryRequest) return;
    this.publish({ primaryContext: { state: "ready", data } });
  }

  presentPrimaryFailure(request: number, error: unknown) {
    if (request !== this.primaryRequest) return;
    this.publish({ primaryContext: { state: "error", error } });
  }

  beginRecentAnalysisRequest() {
    const request = ++this.recentAnalysisRequest;
    this.publish({ recentAnalysis: { state: "loading" } });
    return request;
  }

  presentRecentAnalysis(request: number, jobs: JobPresentation[]) {
    if (request !== this.recentAnalysisRequest) return;
    this.publish({ recentAnalysis: this.prepareRecentAnalysis(jobs) });
  }

  presentRecentAnalysisFailure(request: number, error: unknown) {
    if (request !== this.recentAnalysisRequest) return;
    this.publish({ recentAnalysis: { state: "error", error } });
  }

  private prepareRecentAnalysis(jobs: JobPresentation[]): RecentAnalysisView {
    if (!jobs.length) return { state: "empty" };

    const latest = jobs.reduce((current, job) =>
      new Date(job.createdAt).getTime() > new Date(current.createdAt).getTime()
        ? job
        : current,
    );

    return {
      state: "ready",
      heading:
        latest.submissionType === "TEXT"
          ? "Submitted job description"
          : "Submitted job URL",
      status: latest.status,
      submittedAt: latest.presentation.submittedAt,
      href: latest.presentation.href,
    };
  }

  private publish(changes: Partial<DashboardViewState>) {
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
