import type {
  JobSubmission,
  JobSubmissionInput,
} from "../../../domain/models/Job";

// Define job submission access without coupling use cases to HTTP transport.
export interface JobRepositoryContract {
  list(userId: string): Promise<JobSubmission[]>;

  get(userId: string, jobId: string): Promise<JobSubmission>;

  submit(userId: string, input: JobSubmissionInput): Promise<JobSubmission>;

  delete(userId: string, jobId: string): Promise<void>;
}
