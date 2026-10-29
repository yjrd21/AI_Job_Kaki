import type { AnalysisProfilesOutputContract } from "../../application/contracts/controllers/CandidateContextControllerContract";

export type AnalysisProfilesViewState = {
  readonly profiles: {
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly isLoading: boolean;
    readonly options: readonly {
      readonly id: string;
      readonly label: string;
    }[];
    readonly errorMessage: string | null;
  };
};

// Retain stable snapshots and subscriptions independently of React.
export class AnalysisProfilesStore {
  private state: AnalysisProfilesViewState = {
    profiles: {
      status: "idle",
      isLoading: false,
      options: [],
      errorMessage: null,
    },
  };
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): AnalysisProfilesViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  replace(state: AnalysisProfilesViewState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

// Prepare selector display state; this presenter never calls a controller.
export class AnalysisProfilesPresenter {
  private requestVersion = 0;

  constructor(readonly store: AnalysisProfilesStore) {}

  // Each request receives its own output boundary; cancelled/older outcomes are ignored.
  createRequest(): {
    output: AnalysisProfilesOutputContract;
    cancel: () => void;
  } {
    const version = ++this.requestVersion;
    const publish = (profiles: AnalysisProfilesViewState["profiles"]) => {
      if (version === this.requestVersion) this.store.replace({ profiles });
    };

    return {
      output: {
        presentLoading: () =>
          publish({
            status: "loading",
            isLoading: true,
            options: [],
            errorMessage: null,
          }),
        presentContexts: (contexts) =>
          publish({
            status: "ready",
            isLoading: false,
            options: contexts.map((context) => ({
              id: context.id,
              label: `${context.targetRoles.join(", ") || "Unnamed profile"} — ${context.cvFileName || "No CV"}`,
            })),
            errorMessage: null,
          }),
        presentFailure: () =>
          publish({
            status: "error",
            isLoading: false,
            options: [],
            errorMessage: "Unable to load candidate profiles.",
          }),
      },
      cancel: () => {
        if (version === this.requestVersion) this.requestVersion++;
      },
    };
  }
}
