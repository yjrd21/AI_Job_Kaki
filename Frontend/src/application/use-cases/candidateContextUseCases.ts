import type { AnalysisProfilesOutputContract } from "../contracts/controllers/CandidateContextControllerContract";
import type { CandidateContext } from "../../domain/models/CandidateContext";
import type { CandidateContextPresenterContract } from "../contracts/presenters/CandidateContextPresenterContract";
import type { CandidateContextRepositoryContract } from "../contracts/repositories/CandidateContextRepositoryContract";
import type { CandidateContextInput } from "../../domain/models/CandidateContext";

// Retrieve the candidate profiles belonging to the specified user.
export const listCandidateContexts = (
  r: CandidateContextRepositoryContract,
  userId: string,
) => r.list(userId);

// Retrieve one candidate profile for viewing or editing.
export const getCandidateContext = (
  r: CandidateContextRepositoryContract,
  userId: string,
  id: string,
) => r.get(userId, id);

// Update an existing profile when an identifier is supplied, otherwise create one.
export const saveCandidateContext = (
  r: CandidateContextRepositoryContract,
  userId: string,
  p: CandidateContextInput,
  id?: string,
) => (id ? r.update(userId, id, p) : r.create(userId, p));

// Delete a candidate profile through its repository contract.
export const deleteCandidateContext = (
  r: CandidateContextRepositoryContract,
  userId: string,
  id: string,
) => r.delete(userId, id);

// Select the first returned context as primary and invoke the matching output boundary.
export function getPrimaryCandidateContext<TOutput>(
  contexts: CandidateContext[],
  presenter: Pick<
    CandidateContextPresenterContract<TOutput>,
    "presentPrimary" | "presentEmpty"
  >,
): TOutput {
  const primary = contexts[0];

  return primary ? presenter.presentPrimary(primary) : presenter.presentEmpty();
}

// Present saved contexts as reusable profile-card output.
export function presentCandidateProfiles<TOutput, TProfiles>(
  contexts: CandidateContext[],
  presenter: CandidateContextPresenterContract<TOutput, TProfiles>,
) {
  return presenter.presentProfiles(contexts);
}

// Present one saved context as editable form input.
export function presentCandidateContextEditor<TOutput, TProfiles>(
  context: CandidateContext,
  presenter: CandidateContextPresenterContract<TOutput, TProfiles>,
) {
  return presenter.presentEditor(context);
}

// Load selector data and report each outcome through the supplied output boundary.
export async function loadAnalysisProfiles(
  repository: Pick<CandidateContextRepositoryContract, "list">,
  userId: string,
  output: AnalysisProfilesOutputContract,
): Promise<void> {
  output.presentLoading();

  let contexts: CandidateContext[];
  try {
    contexts = await repository.list(userId);
  } catch (error: unknown) {
    output.presentFailure(error);
    return;
  }

  // Presentation errors must not be misreported as retrieval failures.
  output.presentContexts(contexts);
}
