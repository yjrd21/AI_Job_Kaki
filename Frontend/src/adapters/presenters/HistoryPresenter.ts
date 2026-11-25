import type { JobPresentation } from "./JobPresenter";

type LoadState =
  | { status: "loading"; data: JobPresentation[]; error: null }
  | { status: "ready"; data: JobPresentation[]; error: null }
  | { status: "error"; data: JobPresentation[]; error: unknown };

export type HistoryViewState = {
  jobs: LoadState;
  search: string;
  filteredJobs: JobPresentation[];
  deleting: boolean;
  deleteError: unknown;
};

const initialState = (): HistoryViewState => ({
  jobs: { status: "loading", data: [], error: null },
  search: "",
  filteredJobs: [],
  deleting: false,
  deleteError: null,
});

export class HistoryPresenter {
  private loadRequest = 0;
  private deleteRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): HistoryViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.loadRequest++;
    this.deleteRequest++;
    this.state = initialState();
    this.notify();
  }

  cancelRequests() {
    this.loadRequest++;
    this.deleteRequest++;
  }

  beginLoad(): number {
    const request = ++this.loadRequest;
    if (this.state.jobs.status === "ready") return request;
    this.publish({
      jobs: { status: "loading", data: this.state.jobs.data, error: null },
    });
    return request;
  }

  presentJobs(request: number, data: JobPresentation[]) {
    if (request !== this.loadRequest) return;
    this.publish({ jobs: { status: "ready", data, error: null } });
  }

  presentLoadFailure(request: number, error: unknown) {
    if (request !== this.loadRequest) return;
    this.publish({
      jobs: { status: "error", data: this.state.jobs.data, error },
    });
  }

  presentSearch(search: string) {
    this.publish({ search });
  }

  beginDelete(): number {
    const request = ++this.deleteRequest;
    this.publish({ deleting: true, deleteError: null });
    return request;
  }

  presentDeleteSuccess(request: number): boolean {
    if (request !== this.deleteRequest) return false;
    this.publish({ deleting: false, deleteError: null });
    return true;
  }

  presentDeleteFailure(request: number, error: unknown) {
    if (request === this.deleteRequest) {
      this.publish({ deleting: false, deleteError: error });
    }
  }

  private publish(changes: Partial<HistoryViewState>) {
    const next = { ...this.state, ...changes };
    this.state = {
      ...next,
      filteredJobs: next.jobs.data.filter((job) =>
        `${job.jobContext} ${job.status} ${job.id}`
          .toLowerCase()
          .includes(next.search.toLowerCase()),
      ),
    };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
