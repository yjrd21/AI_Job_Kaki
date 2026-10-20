import type { OnboardingProgressContract } from "./controllers/OnboardingControllerContract";
import type { CandidateContextFormContract } from "./controllers/CandidateContextControllerContract";
import type {
  JobAnalysis,
  JobSubmission,
  JobSubmissionInput,
} from "../../domain/models/Job";
import type { User, UserUpdate } from "../../domain/models/User";
import type {
  CandidateContext,
  CandidateContextInput,
} from "../../domain/models/CandidateContext";

// Define the application API available to views independently of startup wiring.
export interface ApplicationContract<
  TJob extends JobSubmission = JobSubmission,
  TAnalysis extends JobAnalysis = JobAnalysis,
  TPrimaryContext = unknown,
  TProfiles = unknown,
> {
  // Expose user-scoped job submission operations.
  jobs: {
    list(userId: string): Promise<TJob[]>;
    get(userId: string, id: string): Promise<TJob>;
    submit(userId: string, input: JobSubmissionInput): Promise<TJob>;
    delete(userId: string, id: string): Promise<void>;
  };

  // Expose saved analysis retrieval.
  analyses: {
    get(id: string): Promise<TAnalysis>;
  };

  // Expose the coordinated initial profile and account completion workflow.
  onboarding: {
    finish(
      userId: string,
      input: CandidateContextInput,
      progress: OnboardingProgressContract,
    ): Promise<User>;
  };

  // Expose account editing and onboarding completion.
  account: {
    get(userId: string): Promise<User>;
    save(userId: string, update: UserUpdate): Promise<User>;
    completeOnboarding(userId: string): Promise<User>;
  };

  // Expose candidate profile operations with a shared create-or-update action.
  contexts: {
    profiles(contexts: CandidateContext[]): TProfiles;
    editor(context: CandidateContext): CandidateContextFormContract;
    primary(contexts: CandidateContext[]): TPrimaryContext;
    list(userId: string): Promise<CandidateContext[]>;
    get(userId: string, id: string): Promise<CandidateContext>;
    save(
      userId: string,
      input: CandidateContextInput,
      id?: string,
    ): Promise<CandidateContext>;
    delete(userId: string, id: string): Promise<void>;
  };
}
