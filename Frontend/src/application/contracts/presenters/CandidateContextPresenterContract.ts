import type { CandidateContext } from "../../../domain/models/CandidateContext";

export interface CandidateContextForm {
  roles: string;
  preferences: string;
  redFlags: string;
}

// Define the output boundary for the selected primary candidate context.
export interface CandidateContextPresenterContract<
  TOutput,
  TProfiles = unknown,
> {
  presentProfiles(contexts: CandidateContext[]): TProfiles;
  presentEditor(context: CandidateContext): CandidateContextForm;
  presentPrimary(context: CandidateContext): TOutput;
  presentEmpty(): TOutput;
}
