import type { User, UserUpdate } from "../../../domain/models/User";

// Define account access and onboarding operations independently of their storage mechanism.
export interface UserRepositoryContract {
  get(id: string): Promise<User>;
  update(id: string, patch: UserUpdate): Promise<User>;
  delete(id: string): Promise<void>;
  completeOnboarding(id: string): Promise<User>;
}
