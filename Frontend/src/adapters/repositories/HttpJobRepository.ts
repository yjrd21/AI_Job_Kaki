import type { HttpClientContract } from "../../application/contracts/clients/HttpClientContract";
import type { JobRepositoryContract } from "../../application/contracts/repositories/JobRepositoryContract";
import type {
  JobSubmission,
  JobSubmissionInput,
} from "../../domain/models/Job";

// Build this repository's collection path while encoding the owning user identifier.
const jobsPath = (userId: string) =>
  `/api/users/${encodeURIComponent(userId)}/jobs`;

// Build a user-scoped submission path while encoding its identifier.
const jobPath = (userId: string, jobId: string) =>
  `${jobsPath(userId)}/${encodeURIComponent(jobId)}`;

// Implement job submission persistence through the backend API.
export class HttpJobRepository implements JobRepositoryContract {
  // Receive the HTTP transport without depending on its concrete implementation.
  constructor(private readonly http: HttpClientContract) {}

  // Request all submissions belonging to the specified user.
  async list(id: string) {
    // Read the collection returned by the backend endpoint.
    const response = await this.http.get<JobSubmission[]>(jobsPath(id));

    return response.data;
  }

  // Request the latest state of a user-owned job submission.
  async get(id: string, jobId: string) {
    // Read the record returned by the backend endpoint.
    const response = await this.http.get<JobSubmission>(jobPath(id, jobId));

    return response.data;
  }

  // Send the selected profile and job information to the submission endpoint.
  async submit(id: string, input: JobSubmissionInput) {
    // Read the submission created by the backend.
    const response = await this.http.post<JobSubmission>(jobsPath(id), input);

    return response.data;
  }

  // Delete the specified submission through its user-scoped endpoint.
  async delete(id: string, jobId: string) {
    await this.http.delete(jobPath(id, jobId));
  }
}
