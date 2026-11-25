import type { JobAnalysisPresentation, JobPresentation } from "./JobPresenter";

type RequestState<T> =
  | { isLoading: true; isError: false; error: null; data: undefined }
  | { isLoading: false; isError: true; error: unknown; data: undefined }
  | { isLoading: false; isError: false; error: null; data: T | undefined };

export type ResultViewState = {
  job: RequestState<JobPresentation>;
  result: RequestState<JobAnalysisPresentation>;
  deleting: boolean;
  deleteError: unknown;
};

const loading = <T>(): RequestState<T> => ({
  isLoading: true,
  isError: false,
  error: null,
  data: undefined,
});

const initialState = (): ResultViewState => ({
  job: loading(),
  result: {
    isLoading: false,
    isError: false,
    error: null,
    data: undefined,
  },
  deleting: false,
  deleteError: null,
});

export class ResultPresenter {
  private jobRequest = 0;
  private resultRequest = 0;
  private deleteRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): ResultViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.jobRequest++;
    this.resultRequest++;
    this.deleteRequest++;
    this.state = initialState();
    this.notify();
  }

  cancelRequests() {
    this.jobRequest++;
    this.resultRequest++;
    this.deleteRequest++;
  }

  beginJobLoad(): number {
    const request = ++this.jobRequest;
    const data = this.state.job.data;
    this.publish({
      job: data
        ? { isLoading: false, isError: false, error: null, data }
        : loading(),
    });
    return request;
  }

  presentJob(request: number, data: JobPresentation): boolean {
    if (request !== this.jobRequest) return false;
    this.publish({
      job: { isLoading: false, isError: false, error: null, data },
    });
    return true;
  }

  presentJobFailure(request: number, error: unknown): boolean {
    if (request !== this.jobRequest) return false;
    this.publish({
      job: { isLoading: false, isError: true, error, data: undefined },
    });
    return true;
  }

  beginResultLoad(): number {
    const request = ++this.resultRequest;
    this.publish({ result: loading() });
    return request;
  }

  presentResult(request: number, data: JobAnalysisPresentation) {
    if (request === this.resultRequest) {
      this.publish({
        result: { isLoading: false, isError: false, error: null, data },
      });
    }
  }

  presentResultUnavailable() {
    this.resultRequest++;
    this.publish({
      result: {
        isLoading: false,
        isError: false,
        error: null,
        data: undefined,
      },
    });
  }

  presentResultFailure(request: number, error: unknown) {
    if (request === this.resultRequest) {
      this.publish({
        result: { isLoading: false, isError: true, error, data: undefined },
      });
    }
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

  private publish(changes: Partial<ResultViewState>) {
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
