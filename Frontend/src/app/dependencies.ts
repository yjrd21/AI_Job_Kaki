import { OnboardingController } from "../adapters/controllers/OnboardingController";
import { CandidateContextPresenter } from "../adapters/presenters/CandidateContextPresenter";
import { CandidateContextController } from "../adapters/controllers/CandidateContextController";
import { JobPresenter } from "../adapters/presenters/JobPresenter";
import { JobController } from "../adapters/controllers/JobController";
import { AccountController } from "../adapters/controllers/AccountController";
import { createApplication } from "./createApplication";
import { HttpUserRepository } from "../adapters/repositories/HttpUserRepository";
import { HttpCandidateContextRepository } from "../adapters/repositories/HttpCandidateContextRepository";
import { HttpJobRepository } from "../adapters/repositories/HttpJobRepository";
import { HttpAnalysisRepository } from "../adapters/repositories/HttpAnalysisRepository";
import { KeycloakAuthClient } from "../adapters/clients/KeycloakAuthClient";
import { createKeycloakSdk } from "../infrastructure/keycloak/createKeycloakSdk";
import { createHttpClient } from "../infrastructure/clients/createHttpClient";
import { env } from "../infrastructure/config/env";

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

// Construct the stateless job presenter supplied to the use-case output boundary.
const jobPresenter = new JobPresenter();

// Initialize application with repositories connected to HTTP client
export const application = createApplication(
  {
    users: new HttpUserRepository(http),
    contexts: new HttpCandidateContextRepository(http),
    jobs: new HttpJobRepository(http),
    analyses: new HttpAnalysisRepository(http),
  },
  jobPresenter,
  new CandidateContextPresenter(),
);

// Construct the account controller with the application API supplied at startup.
export const accountController = new AccountController(application);

// Construct the job controller with the application API supplied at startup.
export const jobController = new JobController(application);

// Construct the candidate context controller with the application API supplied at startup.
export const candidateContextController = new CandidateContextController(
  application,
);

// Construct the onboarding controller with the coordinated application API.
export const onboardingController = new OnboardingController(application);
