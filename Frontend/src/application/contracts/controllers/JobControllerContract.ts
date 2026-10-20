import type {
  JobAnalysis,
  JobSubmission,
  JobSubmissionType,
} from "../../../domain/models/Job";

// Describe the submission mode, selected profile, and job information received from views.
export interface JobInputContract {
  submissionType: JobSubmissionType;
  candidateContextId: string;
  jobContext: string;
}

// Report validated job input or field errors without exposing a validation library.
export type JobValidationContract =
  | { valid: true; values: JobInputContract }
  | {
      valid: false;
      errors: Partial<Record<keyof JobInputContract, string>>;
      formError?: string;
    };

// Define job input handling and application access available to views.
export interface JobControllerContract<
  TJob extends JobSubmission = JobSubmission,
  TAnalysis extends JobAnalysis = JobAnalysis,
> {
  validateJob(input: unknown): JobValidationContract;
  submitJob(userId: string, input: JobInputContract): Promise<TJob>;
  listJobs(userId: string): Promise<TJob[]>;
  getJob(userId: string, jobId: string): Promise<TJob>;
  getAnalysis(analysisId: string): Promise<TAnalysis>;
  deleteJob(userId: string, jobId: string): Promise<void>;
}
