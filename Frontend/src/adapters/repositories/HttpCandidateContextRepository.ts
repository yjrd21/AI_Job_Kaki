import type { HttpClientContract } from "../../application/contracts/clients/HttpClientContract";
import type { CandidateContextRepositoryContract } from "../../application/contracts/repositories/CandidateContextRepositoryContract";
import type {
  CandidateContext,
  CandidateContextInput,
} from "../../domain/models/CandidateContext";

// Build this repository's collection path while encoding the owning user identifier.
const contextsPath = (userId: string) =>
  `/api/users/${encodeURIComponent(userId)}/candidate-contexts`;

// Build a user-scoped profile path while encoding its identifier.
const contextPath = (userId: string, contextId: string) =>
  `${contextsPath(userId)}/${encodeURIComponent(contextId)}`;

// Implement candidate profile persistence through user-scoped API endpoints.
export class HttpCandidateContextRepository implements CandidateContextRepositoryContract {
  // Receive the transport used for profile operations.
  constructor(private readonly http: HttpClientContract) {}

  // Retrieve all saved candidate profiles for the user.
  async list(id: string) {
    // Read the collection returned by the backend endpoint.
    const r = await this.http.get<CandidateContext[]>(contextsPath(id));

    return r.data;
  }

  // Retrieve the candidate profile selected for editing.
  async get(id: string, contextId: string) {
    // Read the record returned by the backend endpoint.
    const r = await this.http.get<CandidateContext>(contextPath(id, contextId));

    return r.data;
  }

  // Create a candidate profile with preferences and optional CV content.
  async create(id: string, payload: CandidateContextInput) {
    // Read the saved profile returned after creation.
    const r = await this.http.post<CandidateContext>(contextsPath(id), payload);

    return r.data;
  }

  // Replace the editable values of an existing candidate profile.
  async update(id: string, contextId: string, payload: CandidateContextInput) {
    // Read the saved record returned after the update.
    const r = await this.http.put<CandidateContext>(
      contextPath(id, contextId),
      payload,
    );

    return r.data;
  }

  // Delete the selected candidate profile through its user-scoped endpoint.
  async delete(id: string, contextId: string) {
    await this.http.delete(contextPath(id, contextId));
  }
}
