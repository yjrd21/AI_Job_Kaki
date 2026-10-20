import type { JobAnalysis } from "../../../domain/models/Job";

// Define how the application retrieves a saved analysis by its identifier.
export interface JobAnalysisRepositoryContract {
  get(analysisId: string): Promise<JobAnalysis>;
}
