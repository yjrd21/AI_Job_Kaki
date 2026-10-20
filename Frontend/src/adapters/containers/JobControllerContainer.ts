import type {
  JobPresentation,
  JobAnalysisPresentation,
} from "../presenters/JobPresenter";
import { createContext } from "react";
import type { JobControllerContract } from "../../application/contracts/controllers/JobControllerContract";

// Hold the job controller contract without coupling views to its implementation.
export const JobControllerContainer = createContext<JobControllerContract<
  JobPresentation,
  JobAnalysisPresentation
> | null>(null);
