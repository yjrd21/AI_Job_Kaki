import type { JobSubmission, JobAnalysis } from "../../domain/models/Job";
import { z } from "zod";
import type {
  JobControllerContract,
  JobInputContract,
  JobValidationContract,
} from "../../application/contracts/controllers/JobControllerContract";
import type { ApplicationContract } from "../../application/contracts/ApplicationContract";

// Validate the submission mode, selected profile, and trimmed job information.
const jobFormSchema = z.object({
  submissionType: z.enum(["TEXT", "URL"], {
    errorMap: () => ({ message: "Choose a submission type" }),
  }),
  candidateContextId: z.string().min(1, "Choose a candidate profile"),
  jobContext: z.string().trim().min(3, "Enter the job information"),
});

// Implement job input validation and invoke the injected application API.
export class JobController<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
> implements JobControllerContract<TJob, TAnalysis> {
  // Receive job and analysis operations without constructing use cases or repositories.
  constructor(
    private readonly application: Pick<
      ApplicationContract<TJob, TAnalysis>,
      "jobs" | "analyses"
    >,
  ) {}

  // Translate Zod validation results into library-independent field feedback.
  validateJob(input: unknown): JobValidationContract {
    // Validate incoming job values without throwing for field-level errors.
    const result = jobFormSchema.safeParse(input);

    if (result.success) return { valid: true, values: result.data };

    // Collect the first message for each field and any object-level error.
    const { fieldErrors, formErrors } = result.error.flatten();

    return {
      valid: false,
      errors: {
        submissionType: fieldErrors.submissionType?.[0],
        candidateContextId: fieldErrors.candidateContextId?.[0],
        jobContext: fieldErrors.jobContext?.[0],
      },
      formError: formErrors[0],
    };
  }

  // Validate and prepare submission input before invoking the application API.
  async submitJob(userId: string, input: JobInputContract) {
    // Parse at the controller boundary so every caller receives the same input checks and trimming.
    const submission = jobFormSchema.parse(input);

    return this.application.jobs.submit(userId, submission);
  }

  // Retrieve the signed-in user's submission history through the application API.
  listJobs(userId: string) {
    return this.application.jobs.list(userId);
  }

  // Retrieve the current state of a user-owned submission through the application API.
  getJob(userId: string, jobId: string) {
    return this.application.jobs.get(userId, jobId);
  }

  // Retrieve the saved report referenced by a completed submission.
  getAnalysis(analysisId: string) {
    return this.application.analyses.get(analysisId);
  }

  // Delete a user-owned submission through the application API.
  deleteJob(userId: string, jobId: string) {
    return this.application.jobs.delete(userId, jobId);
  }
}
