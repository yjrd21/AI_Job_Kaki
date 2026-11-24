import type { OnboardingInput } from "../controllers/OnboardingController";
import type { User } from "../../domain/models/User";

type AccountStatus =
  | { status: "loading" }
  | { status: "needs-onboarding" }
  | { status: "completed" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

type FormValues = Omit<OnboardingInput, "cv">;

export type OnboardingViewState = {
  account: AccountStatus;
  accountError: string | null;
  screen:
    "loading" | "error" | "unavailable" | "redirect" | "form" | "complete";
  steps: readonly string[];
  step: number;
  stepLabel: string;
  values: FormValues;
  cv: OnboardingInput["cv"];
  cvLoading: boolean;
  error: string | null;
  submissionError: string | null;
  submitting: boolean;
  backDisabled: boolean;
  nextDisabled: boolean;
  nextLabel: string;
};

const steps = ["Target roles", "CV", "Work preferences", "Priorities"] as const;

function initialState(): OnboardingViewState {
  return {
    account: { status: "loading" },
    accountError: null,
    screen: "loading",
    steps,
    step: 0,
    stepLabel: "1 of 4",
    values: {
      roles: "",
      preferences: "",
      redFlags: "",
      arrangement: "",
      locations: "",
    },
    cv: undefined,
    cvLoading: false,
    error: null,
    submissionError: null,
    submitting: false,
    backDisabled: true,
    nextDisabled: false,
    nextLabel: "Continue",
  };
}

export class OnboardingPresenter {
  private finished = false;
  private accountRequest = 0;
  private fileSelection = 0;
  private session = 0;
  private state: OnboardingViewState = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): OnboardingViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.finished = false;
    this.accountRequest++;
    this.fileSelection++;
    this.session++;
    this.state = initialState();
    this.listeners.forEach((listener) => listener());
  }

  getSession() {
    return this.session;
  }

  private publish(changes: Partial<OnboardingViewState>) {
    const state = { ...this.state, ...changes };
    const screen =
      state.account.status === "completed"
        ? this.finished
          ? "complete"
          : "redirect"
        : state.account.status === "needs-onboarding"
          ? this.finished
            ? "complete"
            : "form"
          : state.account.status;
    this.state = {
      ...state,
      screen,
      accountError:
        state.account.status === "error" ? state.account.message : null,
      stepLabel: `${state.step + 1} of ${steps.length}`,
      backDisabled: state.step === 0 || state.submitting || state.cvLoading,
      nextDisabled: state.submitting || state.cvLoading,
      nextLabel: state.submitting
        ? "Saving…"
        : state.step === steps.length - 1
          ? "Finish profile"
          : "Continue",
    };
    this.listeners.forEach((listener) => listener());
  }

  beginAccountRequest() {
    const request = ++this.accountRequest;
    this.publish({ account: { status: "loading" } });
    return request;
  }

  cancelAccountRequest() {
    this.accountRequest++;
  }

  presentAccount(request: number, account: User) {
    if (request !== this.accountRequest) return;
    this.publish({
      account:
        typeof account.onboardingCompleted !== "boolean"
          ? { status: "unavailable" }
          : {
              status: account.onboardingCompleted
                ? "completed"
                : "needs-onboarding",
            },
    });
  }

  presentAccountFailure(request: number, error: unknown) {
    if (request !== this.accountRequest) return;
    this.publish({
      account: {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }

  presentField(key: keyof FormValues, value: string) {
    this.publish({ values: { ...this.state.values, [key]: value } });
  }

  presentError(error: string | null) {
    this.publish({ error });
  }

  presentStep(step: number) {
    this.publish({ step, error: null });
  }

  beginCvSelection(): number {
    const selection = ++this.fileSelection;
    this.publish({ cv: undefined, cvLoading: false, error: null });
    return selection;
  }

  presentCvLoading(selection: number) {
    if (selection === this.fileSelection) this.publish({ cvLoading: true });
  }

  presentCv(selection: number, cv: OnboardingInput["cv"]) {
    if (selection === this.fileSelection)
      this.publish({ cv, cvLoading: false });
  }

  presentCvFailure(selection: number, error: string) {
    if (selection === this.fileSelection)
      this.publish({ error, cvLoading: false });
  }

  presentSubmitting() {
    this.publish({ submitting: true, submissionError: null });
  }

  presentCompletion(session: number) {
    if (session !== this.session) return;
    this.finished = true;
    this.publish({ submitting: false });
  }

  presentSubmissionFailure(session: number, error: unknown) {
    if (session !== this.session) return;
    this.publish({
      submitting: false,
      submissionError: error instanceof Error ? error.message : String(error),
    });
  }
}
