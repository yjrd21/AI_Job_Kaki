import { OnboardingController } from "../adapters/controllers/OnboardingController";
import { CandidateContextPresenter } from "../adapters/presenters/CandidateContextPresenter";
import { CandidateContextController } from "../adapters/controllers/CandidateContextController";
import { JobPresenter } from "../adapters/presenters/JobPresenter";
import { JobController } from "../adapters/controllers/JobController";
import { AccountController } from "../adapters/controllers/AccountController";
import { HttpUserRepository } from "../adapters/repositories/HttpUserRepository";
import { HttpCandidateContextRepository } from "../adapters/repositories/HttpCandidateContextRepository";
import { HttpJobRepository } from "../adapters/repositories/HttpJobRepository";
import { HttpAnalysisRepository } from "../adapters/repositories/HttpAnalysisRepository";
import { KeycloakAuthClient } from "../adapters/clients/KeycloakAuthClient";
import { createKeycloakSdk } from "../infrastructure/keycloak/createKeycloakSdk";
import { createHttpClient } from "../infrastructure/clients/createHttpClient";
import { env } from "../infrastructure/config/env";
import {
  getAccount,
  saveAccount,
} from "../application/use-cases/accountUseCases";
import {
  deleteCandidateContext,
  getCandidateContext,
  getPrimaryCandidateContext,
  listCandidateContexts,
  loadAnalysisProfiles,
  presentCandidateContextEditor,
  presentCandidateProfiles,
  saveCandidateContext,
} from "../application/use-cases/candidateContextUseCases";
import { getAnalysis } from "../application/use-cases/analysisUseCases";
import {
  deleteJob,
  getJob,
  listJobs,
  submitJob,
} from "../application/use-cases/jobUseCases";
import { finishOnboarding } from "../application/use-cases/onboardingUseCases";

// Construct authentication session with environment configuration
export const authSession = new KeycloakAuthClient(
  createKeycloakSdk({
    url: env.keycloakUrl,
    realm: env.keycloakRealm,
    clientId: env.keycloakClientId,
  }),
  {
    login: window.location.origin + "/dashboard",
    logout: window.location.origin,
  },
);

// Create HTTP client with authentication token provider
const http = createHttpClient(env.apiBaseUrl, () =>
  authSession.getAccessToken(),
);

// Construct repositories and presenters at the application composition root.
const userRepository = new HttpUserRepository(http);
const contextRepository = new HttpCandidateContextRepository(http);
const jobRepository = new HttpJobRepository(http);
const analysisRepository = new HttpAnalysisRepository(http);
const jobPresenter = new JobPresenter();
const candidateContextPresenter = new CandidateContextPresenter();

export const accountController = new AccountController({
  getAccount: (userId) => getAccount(userRepository, userId),
  saveAccount: (userId, update) => saveAccount(userRepository, userId, update),
});

export const jobController = new JobController({
  submitJob: (userId, input) =>
    submitJob(jobRepository, jobPresenter, userId, input),
  listJobs: (userId) => listJobs(jobRepository, jobPresenter, userId),
  getJob: (userId, jobId) => getJob(jobRepository, jobPresenter, userId, jobId),
  getAnalysis: (id) => getAnalysis(analysisRepository, jobPresenter, id),
  deleteJob: (userId, jobId) =>
    deleteJob(jobRepository, jobPresenter, userId, jobId),
});

export const candidateContextController = new CandidateContextController({
  getContext: (userId, id) =>
    getCandidateContext(contextRepository, userId, id),
  saveContext: (userId, input, id) =>
    saveCandidateContext(contextRepository, userId, input, id),
  deleteContext: (userId, id) =>
    deleteCandidateContext(contextRepository, userId, id),
  getProfiles: (contexts) =>
    presentCandidateProfiles(contexts, candidateContextPresenter),
  getEditorValues: (context) =>
    presentCandidateContextEditor(context, candidateContextPresenter),
  listContexts: (userId) => listCandidateContexts(contextRepository, userId),
  loadAnalysisProfiles: (userId, output) =>
    loadAnalysisProfiles(contextRepository, userId, output),
  getPrimaryContext: (contexts) =>
    getPrimaryCandidateContext(contexts, candidateContextPresenter),
});

export const onboardingController = new OnboardingController({
  getAccount: (userId) => getAccount(userRepository, userId),
  finishOnboarding: (userId, input, progress) =>
    finishOnboarding(
      contextRepository,
      userRepository,
      userId,
      input,
      progress,
    ),
});
