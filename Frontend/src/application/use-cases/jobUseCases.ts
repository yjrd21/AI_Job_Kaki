import type { JobRepositoryContract } from "../contracts/repositories/JobRepositoryContract";
import type { JobPresenterContract } from "../contracts/presenters/JobPresenterContract";
import type {
  JobAnalysis,
  JobSubmission,
  JobSubmissionInput,
} from "../../domain/models/Job";

// Submit a job and report the successful acknowledgement or request failure through the output boundary.
export async function submitJob<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
>(
  repo: JobRepositoryContract,
  presenter: JobPresenterContract<TJob, TAnalysis>,
  userId: string,
  input: JobSubmissionInput,
): Promise<TJob> {
  // Restrict request-error handling to repository failures rather than presentation failures.
  const job = await repo
    .submit(userId, input)
    .catch((error: unknown) =>
      presenter.presentRequestError("submitJob", error),
    );

  return presenter.presentSubmitted(job);
}

// Retrieve submission history and report its result through the output boundary.
export async function listJobs<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
>(
  repo: JobRepositoryContract,
  presenter: JobPresenterContract<TJob, TAnalysis>,
  userId: string,
): Promise<TJob[]> {
  // Retrieve the user's submissions or present a request failure.
  const jobs = await repo
    .list(userId)
    .catch((error: unknown) =>
      presenter.presentRequestError("listJobs", error),
    );

  return presenter.presentJobs(jobs);
}

// Select the application outcome and invoke its presenter callback without knowing the display representation.
export async function getJob<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
>(
  repo: JobRepositoryContract,
  presenter: JobPresenterContract<TJob, TAnalysis>,
  userId: string,
  jobId: string,
): Promise<TJob> {
  // Retrieve submission state independently of whether the analysis itself succeeded.
  const job = await repo
    .get(userId, jobId)
    .catch((error: unknown) => presenter.presentRequestError("getJob", error));

  switch (job.status) {
    case "PENDING":
      return presenter.presentPending(job);
    case "PROCESSING":
      return presenter.presentProcessing(job);
    case "FAILED":
      return presenter.presentFailed(job);
    case "COMPLETED":
      return presenter.presentCompleted(job);
  }
}

// Delete a submission and report completion or a request failure through the output boundary.
export async function deleteJob(
  repo: JobRepositoryContract,
  presenter: Pick<
    JobPresenterContract,
    "presentDeleted" | "presentRequestError"
  >,
  userId: string,
  jobId: string,
): Promise<void> {
  await repo
    .delete(userId, jobId)
    .catch((error: unknown) =>
      presenter.presentRequestError("deleteJob", error),
    );
  presenter.presentDeleted();
}
