import type { ProfilePresentation } from "./CandidateContextPresenter";

type LoadState =
  | { status: "loading"; data: ProfilePresentation[]; error: null }
  | { status: "ready"; data: ProfilePresentation[]; error: null }
  | { status: "error"; data: ProfilePresentation[]; error: unknown };

export type ProfileViewState = {
  profiles: LoadState;
  deleting: boolean;
  deleteError: unknown;
};

const initialState = (): ProfileViewState => ({
  profiles: { status: "loading", data: [], error: null },
  deleting: false,
  deleteError: null,
});

export class ProfilePresenter {
  private loadRequest = 0;
  private deleteRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): ProfileViewState => this.state;

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
    if (this.state.profiles.status === "ready") return request;
    this.publish({
      profiles: {
        status: "loading",
        data: this.state.profiles.data,
        error: null,
      },
    });
    return request;
  }

  presentProfiles(request: number, data: ProfilePresentation[]) {
    if (request === this.loadRequest) {
      this.publish({ profiles: { status: "ready", data, error: null } });
    }
  }

  presentLoadFailure(request: number, error: unknown) {
    if (request === this.loadRequest) {
      this.publish({
        profiles: {
          status: "error",
          data: this.state.profiles.data,
          error,
        },
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

  private publish(changes: Partial<ProfileViewState>) {
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
