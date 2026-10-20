import { createContext } from "react";
import type { OnboardingControllerContract } from "../../application/contracts/controllers/OnboardingControllerContract";

// Hold the onboarding controller supplied by the composition root.
export const OnboardingControllerContainer =
  createContext<OnboardingControllerContract | null>(null);
