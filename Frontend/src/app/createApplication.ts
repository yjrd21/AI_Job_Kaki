import { finishOnboarding } from "../application/use-cases/onboardingUseCases";
import type { CandidateContextPresenterContract } from "../application/contracts/presenters/CandidateContextPresenterContract";
import type { JobPresenterContract } from "../application/contracts/presenters/JobPresenterContract";
import type { ApplicationContract } from "../application/contracts/ApplicationContract";
import type { UserRepositoryContract } from "../application/contracts/repositories/UserRepositoryContract";
import type { JobRepositoryContract } from "../application/contracts/repositories/JobRepositoryContract";
import type { JobAnalysisRepositoryContract } from "../application/contracts/repositories/JobAnalysisRepositoryContract";
import type { CandidateContextRepositoryContract } from "../application/contracts/repositories/CandidateContextRepositoryContract";
import type {
  JobSubmission,
  JobAnalysis,
  JobSubmissionInput,
} from "../domain/models/Job";
import type { UserUpdate } from "../domain/models/User";
import type {
  CandidateContext,
  CandidateContextInput,
} from "../domain/models/CandidateContext";
import {
  submitJob,
  listJobs,
  getJob,
  deleteJob,
} from "../application/use-cases/jobUseCases";
import { getAnalysis } from "../application/use-cases/analysisUseCases";
import {
  getAccount,
  saveAccount,
  completeOnboarding,
} from "../application/use-cases/accountUseCases";
import {
  presentCandidateProfiles,
  presentCandidateContextEditor,
  getPrimaryCandidateContext,
  listCandidateContexts,
  getCandidateContext,
  saveCandidateContext,
  deleteCandidateContext,
} from "../application/use-cases/candidateContextUseCases";

// Bind repository contracts to use cases and expose the application API consumed by the UI.
export function createApplication<
  TJob extends JobSubmission,
  TAnalysis extends JobAnalysis,
  TPrimaryContext,
  TProfiles,
>(
  repositories: {
    users: UserRepositoryContract;
    contexts: CandidateContextRepositoryContract;
    jobs: JobRepositoryContract;
    analyses: JobAnalysisRepositoryContract;
  },
  presenter: JobPresenterContract<TJob, TAnalysis>,
  contextPresenter: CandidateContextPresenterContract<
    TPrimaryContext,
    TProfiles
  >,
): ApplicationContract<TJob, TAnalysis, TPrimaryContext, TProfiles> {
  return {
    // Bind job submission operations to the supplied job repository.
    jobs: {
      list: (userId: string) => listJobs(repositories.jobs, presenter, userId),
      get: (userId: string, id: string) =>
        getJob(repositories.jobs, presenter, userId, id),
      submit: (userId: string, input: JobSubmissionInput) =>
        submitJob(repositories.jobs, presenter, userId, input),
      delete: (userId: string, id: string) =>
        deleteJob(repositories.jobs, presenter, userId, id),
    },

    // Bind saved report retrieval to the supplied analysis repository.
    analyses: {
      get: (id: string) => getAnalysis(repositories.analyses, presenter, id),
    },

    // Bind onboarding coordination to the supplied context and user repositories.
    onboarding: {
      finish: (userId, input, progress) =>
        finishOnboarding(
          repositories.contexts,
          repositories.users,
          userId,
          input,
          progress,
        ),
    },

    // Bind account editing and onboarding completion to the supplied user repository.
    account: {
      get: (userId: string) => getAccount(repositories.users, userId),
      save: (userId: string, update: UserUpdate) =>
        saveAccount(repositories.users, userId, update),
      completeOnboarding: (userId: string) =>
        completeOnboarding(repositories.users, userId),
    },

    // Bind profile operations to the supplied candidate context repository.
    contexts: {
      profiles: (contexts) =>
        presentCandidateProfiles(contexts, contextPresenter),
      editor: (context) =>
        presentCandidateContextEditor(context, contextPresenter),
      primary: (contexts: CandidateContext[]) =>
        getPrimaryCandidateContext(contexts, contextPresenter),
      list: (userId: string) =>
        listCandidateContexts(repositories.contexts, userId),
      get: (userId: string, id: string) =>
        getCandidateContext(repositories.contexts, userId, id),
      save: (userId: string, input: CandidateContextInput, id?: string) =>
        saveCandidateContext(repositories.contexts, userId, input, id),
      delete: (userId: string, id: string) =>
        deleteCandidateContext(repositories.contexts, userId, id),
    },
  };
}
