import { formatDate } from "../views/utils/dateUtils";
import { preview } from "../views/utils/textUtils";
import type { JobAnalysis, JobSubmission } from "../../domain/models/Job";
import type {
  JobOperationContract,
  JobPresenterContract,
} from "../../application/contracts/presenters/JobPresenterContract";

// Describe the processing or recovery content rendered by a submission view.
type JobDisplayState =
  | { state: "pending" | "processing"; heading: string; message: string }
  | {
      state: "failed";
      heading: string;
      message: string;
      actionLabel: string;
      actionHref: string;
    }
  | { state: "completed"; reanalyseHref: string };

// Retain submission data for polling and links alongside presenter-prepared display state.
export type JobPresentation = JobSubmission & {
  presentation: JobDisplayState & {
    summary: string;
    submittedAt: string;
    submissionLabel: string;
    href: string;
    resultHeading: string;
  };
};

// Retain report data alongside the presenter-prepared report heading and role overview.
export type JobAnalysisPresentation = JobAnalysis & {
  presentation: {
    heading: string;
    roleOverview: string;
    hasRoleOverview: boolean;
    details: { label: string; value: string }[];
  };
};

// Represent a request failure separately from a retrieved submission whose analysis failed.
export class JobRequestError extends Error {
  readonly state = "request-error";

  // Preserve the original failure as the cause while exposing a display-ready message.
  constructor(
    public readonly operation: JobOperationContract,
    error: unknown,
  ) {
    super(
      error instanceof Error
        ? error.message
        : "Unable to complete the job request. Please try again.",
      { cause: error },
    );
    this.name = "JobRequestError";
  }
}

// Implement the use-case output boundary with stateless display output for React Query.
export class JobPresenter implements JobPresenterContract<
  JobPresentation,
  JobAnalysisPresentation
> {
  // Prepare the backend acknowledgement using its current processing state.
  presentSubmitted(job: JobSubmission): JobPresentation {
    return this.presentSubmission(job);
  }

  // Prepare independent display state for each submission in a history response.
  presentJobs(jobs: JobSubmission[]): JobPresentation[] {
    return jobs.map((job) => this.presentSubmission(job));
  }

  // Prepare the queued analysis display state.
  presentPending(job: JobSubmission): JobPresentation {
    return {
      ...job,
      presentation: {
        ...this.presentSubmissionDetails(job),
        state: "pending",
        heading: "Your analysis is in the queue.",
        message:
          "This page refreshes automatically while your analysis runs. You can safely leave and return from Job History.",
      },
    };
  }

  // Prepare the actively processing analysis display state.
  presentProcessing(job: JobSubmission): JobPresentation {
    return {
      ...job,
      presentation: {
        ...this.presentSubmissionDetails(job),
        state: "processing",
        heading: "We're reviewing the opportunity.",
        message:
          "This page refreshes automatically while your analysis runs. You can safely leave and return from Job History.",
      },
    };
  }

  // Prepare an analysis failure message and the appropriate recovery destination.
  presentFailed(job: JobSubmission): JobPresentation {
    // Direct CV failures to profile editing and source failures to pasted job input.
    const needsCvUpdate = [
      "CV_MISSING",
      "CV_TOO_LARGE",
      "CV_FORMAT_UNSUPPORTED",
      "CV_FILE_INVALID",
      "CV_CONTENT_UNAVAILABLE",
    ].includes(job.errorCode || "");

    return {
      ...job,
      presentation: {
        ...this.presentSubmissionDetails(job),
        state: "failed",
        heading: "We couldn't complete this analysis.",
        message:
          job.errorMessage ||
          "We couldn't complete this analysis. Please paste the full job description and try again.",
        actionLabel: needsCvUpdate
          ? "Update candidate profile"
          : "Paste job description",
        actionHref: needsCvUpdate
          ? `/profiles/${encodeURIComponent(job.candidateContextId)}`
          : `/analyse?type=TEXT&context=${encodeURIComponent(job.candidateContextId)}${job.submissionType === "TEXT" ? `&jobContext=${encodeURIComponent(job.jobContext)}` : ""}`,
      },
    };
  }

  // Signal that the completed submission can display its separately retrieved report.
  presentCompleted(job: JobSubmission): JobPresentation {
    return {
      ...job,
      presentation: {
        ...this.presentSubmissionDetails(job),
        state: "completed",
        reanalyseHref: `/analyse?type=${job.submissionType}&context=${encodeURIComponent(job.candidateContextId)}&jobContext=${encodeURIComponent(job.jobContext)}`,
      },
    };
  }

  // Prepare report text while preserving report data needed by the view.
  presentAnalysis(analysis: JobAnalysis): JobAnalysisPresentation {
    return {
      ...analysis,
      presentation: {
        heading: analysis.roleTitle || "Job analysis",
        details: [
          { label: "Role", value: analysis.roleTitle || "Not provided" },
          {
            label: "Salary range",
            value: analysis.salaryRange || "Not provided",
          },
          {
            label: "Application deadline",
            value: analysis.applicationDeadline || "Not provided",
          },
          { label: "Analysed", value: formatDate(analysis.createdAt) },
        ],
        hasRoleOverview: !!analysis.roleOverview?.trim(),
        roleOverview:
          analysis.roleOverview?.trim() ||
          "Role overview is unavailable for this analysis.",
      },
    };
  }

  // Acknowledge deletion without adding shared state or controlling navigation.
  presentDeleted(): void {}

  // Expose a request-error display outcome while preserving React Query retries and error state.
  presentRequestError(operation: JobOperationContract, error: unknown): never {
    throw new JobRequestError(operation, error);
  }

  // Prepare shared submission labels and destinations for history and result views.
  private presentSubmissionDetails(job: JobSubmission) {
    return {
      summary: preview(job.jobContext, 90),
      submittedAt: formatDate(job.createdAt),
      submissionLabel:
        job.submissionType === "URL" ? "Job URL" : "Job description",
      href: `/jobs/${encodeURIComponent(job.id)}`,
      resultHeading: "Job analysis",
    };
  }

  // Format the statuses contained in successful submission and list responses.
  private presentSubmission(job: JobSubmission): JobPresentation {
    switch (job.status) {
      case "PENDING":
        return this.presentPending(job);
      case "PROCESSING":
        return this.presentProcessing(job);
      case "FAILED":
        return this.presentFailed(job);
      case "COMPLETED":
        return this.presentCompleted(job);
    }
  }
}
