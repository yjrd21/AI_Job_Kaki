import type { CandidateContextForm } from "../../application/contracts/presenters/CandidateContextPresenterContract";

type ProfileState =
  | { status: "idle" | "loading"; values: null; cvFileName: null; error: null }
  | {
      status: "ready";
      values: CandidateContextForm;
      cvFileName: string | null;
      error: null;
    }
  | {
      status: "error";
      values: null;
      cvFileName: null;
      error: unknown;
    };

export type ProfileEditorViewState = {
  profile: ProfileState;
  cv: { name: string; content: string } | undefined;
  cvLoading: boolean;
  fileError: string | null;
  save: { status: "idle" | "saving" | "saved" | "error"; error: unknown };
};

const initialState = (): ProfileEditorViewState => ({
  profile: {
    status: "idle",
    values: null,
    cvFileName: null,
    error: null,
  },
  cv: undefined,
  cvLoading: false,
  fileError: null,
  save: { status: "idle", error: null },
});

export class ProfileEditorPresenter {
  private profileRequest = 0;
  private fileSelection = 0;
  private saveRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): ProfileEditorViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.profileRequest++;
    this.fileSelection++;
    this.saveRequest++;
    this.state = initialState();
    this.notify();
  }

  cancelRequests() {
    this.profileRequest++;
    this.fileSelection++;
    this.saveRequest++;
  }

  beginProfileLoad(): number {
    const request = ++this.profileRequest;
    this.fileSelection++;
    this.saveRequest++;
    this.publish({
      profile: {
        status: "loading",
        values: null,
        cvFileName: null,
        error: null,
      },
      cv: undefined,
      cvLoading: false,
      fileError: null,
      save: { status: "idle", error: null },
    });
    return request;
  }

  presentProfile(
    request: number,
    values: CandidateContextForm,
    cvFileName: string | null,
  ) {
    if (request === this.profileRequest) {
      this.publish({
        profile: { status: "ready", values, cvFileName, error: null },
      });
    }
  }

  presentProfileFailure(request: number, error: unknown) {
    if (request === this.profileRequest) {
      this.publish({
        profile: { status: "error", values: null, cvFileName: null, error },
      });
    }
  }

  beginFileSelection(): number {
    const selection = ++this.fileSelection;
    this.publish({ cv: undefined, cvLoading: false, fileError: null });
    return selection;
  }

  presentFileLoading(selection: number) {
    if (selection === this.fileSelection) {
      this.publish({ cvLoading: true });
    }
  }

  presentCv(selection: number, cv: { name: string; content: string }) {
    if (selection === this.fileSelection) {
      this.publish({ cv, cvLoading: false });
    }
  }

  presentFileFailure(selection: number, error: unknown) {
    if (selection === this.fileSelection) {
      this.publish({
        cvLoading: false,
        fileError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  beginSave(): number {
    const request = ++this.saveRequest;
    this.publish({ save: { status: "saving", error: null } });
    return request;
  }

  presentSaveSuccess(request: number): boolean {
    if (request !== this.saveRequest) return false;
    this.publish({ save: { status: "saved", error: null } });
    return true;
  }

  presentSaveFailure(request: number, error: unknown) {
    if (request === this.saveRequest) {
      this.publish({ save: { status: "error", error } });
    }
  }

  private publish(changes: Partial<ProfileEditorViewState>) {
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
