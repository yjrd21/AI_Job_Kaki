import type { HttpClientContract } from "../../application/contracts/clients/HttpClientContract";
import type { UserRepositoryContract } from "../../application/contracts/repositories/UserRepositoryContract";
import type { User, UserUpdate } from "../../domain/models/User";

// Build this repository's account path while encoding the user identifier.
const userPath = (userId: string) => `/api/users/${encodeURIComponent(userId)}`;

// Implement account persistence and onboarding completion through the backend API.
export class HttpUserRepository implements UserRepositoryContract {
  // Receive the transport used for account operations.
  constructor(private readonly http: HttpClientContract) {}

  // Retrieve the user account and its onboarding status.
  async get(id: string) {
    // Read the record returned by the backend endpoint.
    const r = await this.http.get<User>(userPath(id));

    return r.data;
  }

  // Send changes to the editable account fields to the backend.
  async update(id: string, patch: UserUpdate) {
    // Read the saved record returned after the update.
    const r = await this.http.put<User>(userPath(id), patch);

    return r.data;
  }

  // Mark the account onboarding workflow as complete through the backend endpoint.
  async completeOnboarding(id: string) {
    // Backend endpoint is a Phase 3 dependency, not implemented in this frontend PR.
    const r = await this.http.post<User>(`${userPath(id)}/onboarding/complete`);

    return r.data;
  }

  // Delete the specified application account through the backend API.
  async delete(id: string) {
    await this.http.delete(userPath(id));
  }
}
