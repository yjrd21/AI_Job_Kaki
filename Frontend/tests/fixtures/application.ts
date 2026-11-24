import { OnboardingController } from "../../src/adapters/controllers/OnboardingController";
import { CandidateContextPresenter } from "../../src/adapters/presenters/CandidateContextPresenter";
import { CandidateContextController } from "../../src/adapters/controllers/CandidateContextController";
import { JobPresenter } from "../../src/adapters/presenters/JobPresenter";
import { JobController } from "../../src/adapters/controllers/JobController";
import { AccountController } from "../../src/adapters/controllers/AccountController";
import { vi } from "vitest";
import {
  getAccount,
  saveAccount,
} from "../../src/application/use-cases/accountUseCases";
import {
  deleteCandidateContext,
  getCandidateContext,
  getPrimaryCandidateContext,
  listCandidateContexts,
  loadAnalysisProfiles,
  presentCandidateContextEditor,
  presentCandidateProfiles,
  saveCandidateContext,
} from "../../src/application/use-cases/candidateContextUseCases";
import { getAnalysis } from "../../src/application/use-cases/analysisUseCases";
import {
  deleteJob,
  getJob,
  listJobs,
  submitJob,
} from "../../src/application/use-cases/jobUseCases";
import { finishOnboarding } from "../../src/application/use-cases/onboardingUseCases";
import type {
  AuthClientContract,
  AuthSessionContract,
} from "../../src/application/contracts/clients/AuthClientContract";

import type { JobSubmission, JobAnalysis } from "../../src/domain/models/Job";
import type { User } from "../../src/domain/models/User";
import type { CandidateContext } from "../../src/domain/models/CandidateContext";

export const job: JobSubmission = {
  id: "job-id",
  userId: "user-id",
  candidateContextId: "profile-id",
  submissionType: "TEXT",
  jobContext: "Job description",
  status: "PENDING",
  jobAnalysisId: null,
  createdAt: "2026-10-17T07:13:08Z",
  updatedAt: "2026-10-17T07:13:08Z",
};
export const analysis: JobAnalysis = {
  id: "analysis-id",
  jobSubmissionId: "job-id",
  roleOverview: null,
  roleTitle: null,
  applicationDeadline: null,
  salaryRange: null,
  redFlags: [],
  requirements: [],
  matchSummary: "The role matches your experience.",
  questionsToClarify: [],
  createdAt: job.createdAt,
};
export const account: User = {
  id: "user-id",
  keycloakId: "user-id",
  email: "candidate@example.com",
  firstName: "First",
  lastName: "Last",
  onboardingCompleted: false,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
};
export const profile: CandidateContext = {
  id: "profile-id",
  userId: "user-id",
  cvFileName: "cv.pdf",
  targetRoles: ["Engineer"],
  preferences: [],
  redFlags: [],
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
};
export const signedIn: AuthSessionContract = {
  authenticated: true,
  userId: "user-id",
  name: "Candidate",
  error: null,
};
export function makeSession(
  snapshot: AuthSessionContract = signedIn,
): AuthClientContract {
  return {
    initialise: vi.fn().mockResolvedValue(snapshot),
    subscribe: vi.fn(() => () => undefined),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getAccessToken: vi.fn().mockResolvedValue(undefined),
  };
}
export function makeControllers() {
  const repositories = {
    jobs: {
      list: vi.fn().mockResolvedValue([job]),
      get: vi.fn().mockResolvedValue(job),
      submit: vi.fn().mockResolvedValue(job),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    analyses: { get: vi.fn().mockResolvedValue(analysis) },
    users: {
      get: vi.fn().mockResolvedValue(account),
      update: vi.fn().mockResolvedValue(account),
      completeOnboarding: vi
        .fn()
        .mockResolvedValue({ ...account, onboardingCompleted: true }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    contexts: {
      list: vi.fn().mockResolvedValue([profile]),
      get: vi.fn().mockResolvedValue(profile),
      create: vi.fn().mockResolvedValue(profile),
      update: vi.fn().mockResolvedValue(profile),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  };
  const jobPresenter = new JobPresenter();
  const candidateContextPresenter = new CandidateContextPresenter();
  const accountController = new AccountController({
    getAccount: (userId) => getAccount(repositories.users, userId),
    saveAccount: (userId, update) =>
      saveAccount(repositories.users, userId, update),
  });
  const jobController = new JobController({
    submitJob: (userId, input) =>
      submitJob(repositories.jobs, jobPresenter, userId, input),
    listJobs: (userId) => listJobs(repositories.jobs, jobPresenter, userId),
    getJob: (userId, jobId) =>
      getJob(repositories.jobs, jobPresenter, userId, jobId),
    getAnalysis: (id) => getAnalysis(repositories.analyses, jobPresenter, id),
    deleteJob: (userId, jobId) =>
      deleteJob(repositories.jobs, jobPresenter, userId, jobId),
  });
  const candidateContextController = new CandidateContextController({
    getContext: (userId, id) =>
      getCandidateContext(repositories.contexts, userId, id),
    saveContext: (userId, input, id) =>
      saveCandidateContext(repositories.contexts, userId, input, id),
    deleteContext: (userId, id) =>
      deleteCandidateContext(repositories.contexts, userId, id),
    getProfiles: (contexts) =>
      presentCandidateProfiles(contexts, candidateContextPresenter),
    getEditorValues: (context) =>
      presentCandidateContextEditor(context, candidateContextPresenter),
    listContexts: (userId) =>
      listCandidateContexts(repositories.contexts, userId),
    loadAnalysisProfiles: (userId, output) =>
      loadAnalysisProfiles(repositories.contexts, userId, output),
    getPrimaryContext: (contexts) =>
      getPrimaryCandidateContext(contexts, candidateContextPresenter),
  });
  const onboardingController = new OnboardingController({
    getAccount: (userId) => getAccount(repositories.users, userId),
    finishOnboarding: (userId, input, progress) =>
      finishOnboarding(
        repositories.contexts,
        repositories.users,
        userId,
        input,
        progress,
      ),
  });
  return {
    onboardingController,
    candidateContextController,
    accountController,
    jobController,
    jobPresenter,
    repositories,
  };
}
