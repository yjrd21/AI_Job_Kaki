import type { ResolverResult } from "react-hook-form";
import type { CandidateContext } from "../../domain/models/CandidateContext";
import type { JobInput, JobValidation } from "../controllers/JobController";

type ProfileOption = { id: string; label: string };

type JobValidationPresentation =
  | { valid: true; values: JobInput }
  | {
      valid: false;
      fieldErrors: Record<keyof JobInput, string | null>;
      formError: string | null;
    };

type AnalysisQueryValues = {
  type: string | null;
  context: string | null;
  jobContext: string | null;
};

export type AnalysisViewState = {
  profiles: {
    status: "loading" | "ready" | "error";
    options: ProfileOption[];
    errorMessage: string | null;
  };
  submission: {
    status: "idle" | "submitting" | "error";
    error: unknown;
  };
};

const initialState = (): AnalysisViewState => ({
  profiles: { status: "loading", options: [], errorMessage: null },
  submission: { status: "idle", error: null },
});

export class AnalysisPresenter {
  private profileRequest = 0;
  private submissionRequest = 0;
  private state = initialState();
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): AnalysisViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  reset() {
    this.profileRequest++;
    this.submissionRequest++;
    this.state = initialState();
    this.notify();
  }

  cancelRequests() {
    this.profileRequest++;
    this.submissionRequest++;
  }

  presentInitialFormValues(query: AnalysisQueryValues): JobInput {
    return {
      submissionType: query.type === "URL" ? "URL" : "TEXT",
      candidateContextId: query.context ?? "",
      jobContext: query.jobContext ?? "",
    };
  }

  presentValidation(validation: JobValidation): JobValidationPresentation {
    if (validation.valid) {
      return { valid: true, values: validation.values };
    }

    return {
      valid: false,
      fieldErrors: {
        submissionType: validation.errors.submissionType ?? null,
        candidateContextId: validation.errors.candidateContextId ?? null,
        jobContext: validation.errors.jobContext ?? null,
      },
      formError: validation.formError ?? null,
    };
  }

  toResolverResult(
    validation: JobValidationPresentation,
  ): ResolverResult<JobInput> {
    if (validation.valid) {
      return { values: validation.values, errors: {} };
    }

    return {
      values: {},
      errors: {
        submissionType: validation.fieldErrors.submissionType
          ? {
              type: "validate",
              message: validation.fieldErrors.submissionType,
            }
          : undefined,
        candidateContextId: validation.fieldErrors.candidateContextId
          ? {
              type: "validate",
              message: validation.fieldErrors.candidateContextId,
            }
          : undefined,
        jobContext: validation.fieldErrors.jobContext
          ? { type: "validate", message: validation.fieldErrors.jobContext }
          : undefined,
        root: validation.formError
          ? {
              controller: { type: "validate", message: validation.formError },
            }
          : undefined,
      },
    };
  }

  beginProfileRequest() {
    const request = ++this.profileRequest;
    this.publish({
      profiles: { status: "loading", options: [], errorMessage: null },
    });

    return {
      presentLoading: () => {
        if (request === this.profileRequest) {
          this.publish({
            profiles: { status: "loading", options: [], errorMessage: null },
          });
        }
      },
      presentContexts: (contexts: CandidateContext[]) => {
        if (request === this.profileRequest) {
          this.publish({
            profiles: {
              status: "ready",
              options: this.prepareProfiles(contexts),
              errorMessage: null,
            },
          });
        }
      },
      presentFailure: () => {
        if (request === this.profileRequest) {
          this.publish({
            profiles: {
              status: "error",
              options: [],
              errorMessage: "Unable to load candidate profiles.",
            },
          });
        }
      },
    };
  }

  beginSubmission(): number {
    const request = ++this.submissionRequest;
    this.publish({ submission: { status: "submitting", error: null } });
    return request;
  }

  presentSubmissionSuccess(request: number): boolean {
    if (request !== this.submissionRequest) return false;
    this.publish({ submission: { status: "idle", error: null } });
    return true;
  }

  presentSubmissionFailure(request: number, error: unknown) {
    if (request === this.submissionRequest) {
      this.publish({ submission: { status: "error", error } });
    }
  }

  private prepareProfiles(contexts: CandidateContext[]): ProfileOption[] {
    return contexts.map((context) => ({
      id: context.id,
      label: `${context.targetRoles.join(", ") || "Unnamed profile"} — ${context.cvFileName || "No CV"}`,
    }));
  }

  private publish(changes: Partial<AnalysisViewState>) {
    this.state = { ...this.state, ...changes };
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
