import type { JobAnalysisRepositoryContract } from "../contracts/repositories/JobAnalysisRepositoryContract";
import type { JobPresenterContract } from "../contracts/presenters/JobPresenterContract";
import type { JobAnalysis, JobSubmission } from "../../domain/models/Job";

// Retrieve a saved report and send the result to its presenter output boundary.
export async function getAnalysis<TAnalysis extends JobAnalysis>(
  repo: JobAnalysisRepositoryContract,
  presenter: Pick<
    JobPresenterContract<JobSubmission, TAnalysis>,
    "presentAnalysis" | "presentRequestError"
  >,
  id: string,
): Promise<TAnalysis> {
  // Report failed retrieval separately from the processing state of the original submission.
  const analysis = await repo
    .get(id)
    .catch((error: unknown) =>
      presenter.presentRequestError("getAnalysis", error),
    );

  return presenter.presentAnalysis(analysis);
}
