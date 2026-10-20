import type { CandidateContextFormContract } from "../controllers/CandidateContextControllerContract";
import type { CandidateContext } from "../../../domain/models/CandidateContext";

// Define the output boundary for the selected primary candidate context.
export interface CandidateContextPresenterContract<
  TOutput,
  TProfiles = unknown,
> {
  presentProfiles(contexts: CandidateContext[]): TProfiles;
  presentEditor(context: CandidateContext): CandidateContextFormContract;
  presentPrimary(context: CandidateContext): TOutput;
  presentEmpty(): TOutput;
}
