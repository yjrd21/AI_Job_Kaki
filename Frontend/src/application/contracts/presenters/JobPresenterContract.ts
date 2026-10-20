import type { JobAnalysis, JobSubmission } from "../../../domain/models/Job";

// Identify the application operation that could not complete its request.
export type JobOperationContract =
  "submitJob" | "listJobs" | "getJob" | "getAnalysis" | "deleteJob";

// Define the output boundary invoked by job use cases without prescribing a UI representation.
export interface JobPresenterContract<
  TJob extends JobSubmission = JobSubmission,
  TAnalysis extends JobAnalysis = JobAnalysis,
> {
  presentSubmitted(job: JobSubmission): TJob;
  presentJobs(jobs: JobSubmission[]): TJob[];
  presentPending(job: JobSubmission): TJob;
  presentProcessing(job: JobSubmission): TJob;
  presentFailed(job: JobSubmission): TJob;
  presentCompleted(job: JobSubmission): TJob;
  presentAnalysis(analysis: JobAnalysis): TAnalysis;
  presentDeleted(): void;
  presentRequestError(operation: JobOperationContract, error: unknown): never;
}
