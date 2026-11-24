import type {
  JobAnalysis,
  JobSubmission,
  JobSubmissionInput,
} from "../../domain/models/Job";
import { z } from "zod";
import type {
  JobControllerContract,
  JobInputContract,
  JobValidationContract,
} from "../../application/contracts/controllers/JobControllerContract";

type JobControllerDependencies<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
> = {
  submitJob(userId: string, input: JobSubmissionInput): Promise<TJob>;
  listJobs(userId: string): Promise<TJob[]>;
  getJob(userId: string, jobId: string): Promise<TJob>;
  getAnalysis(analysisId: string): Promise<TAnalysis>;
  deleteJob(userId: string, jobId: string): Promise<void>;
};

// Validate the submission mode, selected profile, and trimmed job information.
const jobFormSchema = z.object({
  submissionType: z.enum(["TEXT", "URL"], {
    errorMap: () => ({ message: "Choose a submission type" }),
  }),
  candidateContextId: z.string().min(1, "Choose a candidate profile"),
  jobContext: z.string().trim().min(3, "Enter the job information"),
});

// Validate job input and invoke the injected use cases.
export class JobController<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
> implements JobControllerContract<TJob, TAnalysis> {
  constructor(
    private readonly dependencies: JobControllerDependencies<TJob, TAnalysis>,
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

  // Validate and prepare submission input before invoking the submit use case.
  async submitJob(userId: string, input: JobInputContract) {
    // Parse at the controller boundary so every caller receives the same input checks and trimming.
    const submission = jobFormSchema.parse(input);

    return this.dependencies.submitJob(userId, submission);
  }

  // Retrieve the signed-in user's submission history.
  listJobs(userId: string) {
    return this.dependencies.listJobs(userId);
  }

  // Retrieve the current state of a user-owned submission.
  getJob(userId: string, jobId: string) {
    return this.dependencies.getJob(userId, jobId);
  }

  // Retrieve the saved report referenced by a completed submission.
  getAnalysis(analysisId: string) {
    return this.dependencies.getAnalysis(analysisId);
  }

  // Delete a user-owned submission.
  deleteJob(userId: string, jobId: string) {
    return this.dependencies.deleteJob(userId, jobId);
  }
}
