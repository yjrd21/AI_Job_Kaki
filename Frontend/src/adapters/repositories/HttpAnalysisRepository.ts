import type { HttpClientContract } from "../../application/contracts/clients/HttpClientContract";
import type { JobAnalysisRepositoryContract } from "../../application/contracts/repositories/JobAnalysisRepositoryContract";
import type { JobAnalysis } from "../../domain/models/Job";

// Retrieve saved analyses through the backend API and preserve legacy array defaults.
export class HttpAnalysisRepository implements JobAnalysisRepositoryContract {
  // Receive the transport used to request saved analysis reports.
  constructor(private readonly http: HttpClientContract) {}

  // Retrieve an analysis and default missing collection fields to empty arrays.
  async get(id: string): Promise<JobAnalysis> {
    // Read the analysis payload returned by its backend endpoint.
    const { data } = await this.http.get<JobAnalysis>(
      `/api/job-analyses/${encodeURIComponent(id)}`,
    );

    // Retain compatibility with older API responses that omit these arrays.
    return {
      ...data,
      requirements: data.requirements ?? [],
      redFlags: data.redFlags ?? [],
      questionsToClarify: data.questionsToClarify ?? [],
    };
  }
}
