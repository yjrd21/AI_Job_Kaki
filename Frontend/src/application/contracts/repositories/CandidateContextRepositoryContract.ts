import type {
  CandidateContext,
  CandidateContextInput,
} from "../../../domain/models/CandidateContext";

// Define profile creation, retrieval, updates, and deletion for a user.
export interface CandidateContextRepositoryContract {
  list(userId: string): Promise<CandidateContext[]>;

  get(userId: string, id: string): Promise<CandidateContext>;

  create(
    userId: string,
    payload: CandidateContextInput,
  ): Promise<CandidateContext>;

  update(
    userId: string,
    id: string,
    payload: CandidateContextInput,
  ): Promise<CandidateContext>;

  delete(userId: string, id: string): Promise<void>;
}
