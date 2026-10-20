import type { UserRepositoryContract } from "../contracts/repositories/UserRepositoryContract";
import type { UserUpdate } from "../../domain/models/User";

// Retrieve the application account through its repository contract.
export const getAccount = (r: UserRepositoryContract, id: string) => r.get(id);

// Persist changes to the editable account fields.
export const saveAccount = (
  r: UserRepositoryContract,
  id: string,
  update: UserUpdate,
) => r.update(id, update);

// Record that the user has completed the initial account setup.
export const completeOnboarding = (
  repo: UserRepositoryContract,
  userId: string,
) => repo.completeOnboarding(userId);
