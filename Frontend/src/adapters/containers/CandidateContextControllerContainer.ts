import { createContext } from "react";
import type { CandidateContextControllerContract } from "../../application/contracts/controllers/CandidateContextControllerContract";
import type {
  PrimaryContextPresentation,
  ProfilePresentation,
} from "../presenters/CandidateContextPresenter";

// Hold the candidate context controller supplied by the composition root.
export const CandidateContextControllerContainer =
  createContext<CandidateContextControllerContract<
    PrimaryContextPresentation,
    ProfilePresentation[]
  > | null>(null);
