import type {
  CandidateContext,
  CandidateContextInput,
} from "../../../domain/models/CandidateContext";

// Describe the editable multiline fields accepted by candidate context forms.
export interface CandidateContextFormContract {
  roles: string;
  preferences: string;
  redFlags: string;
}

// Describe field feedback without depending on a validation library.
export type CandidateContextValidationContract =
  | { valid: true; values: CandidateContextFormContract }
  | {
      valid: false;
      errors: Partial<Record<keyof CandidateContextFormContract, string>>;
    };

// Report profile-selector outcomes without exposing React or query-library state.
export interface AnalysisProfilesOutputContract {
  presentLoading(): void;
  presentContexts(contexts: CandidateContext[]): void;
  presentFailure(error: unknown): void;
}

// Define candidate context retrieval and primary-context preparation for consumers.
export interface CandidateContextControllerContract<
  TOutput,
  TProfiles = unknown,
> {
  getContext(userId: string, id: string): Promise<CandidateContext>;
  saveContext(
    userId: string,
    input: CandidateContextInput,
    id?: string,
  ): Promise<CandidateContext>;
  deleteContext(userId: string, id: string): Promise<void>;
  validateProfile(input: unknown): CandidateContextValidationContract;
  prepareProfile(
    input: CandidateContextFormContract,
    cv?: { name: string; content: string },
  ): CandidateContextInput;
  getEditorValues(context: CandidateContext): CandidateContextFormContract;
  getProfiles(contexts: CandidateContext[]): TProfiles;
  listContexts(userId: string): Promise<CandidateContext[]>;
  loadAnalysisProfiles(
    userId: string,
    output: AnalysisProfilesOutputContract,
  ): Promise<void>;
  getPrimaryContext(contexts: CandidateContext[]): TOutput;
}
