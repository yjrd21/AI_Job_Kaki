import { HttpUserRepository } from "../features/users/infrastructure/repositories/HttpUserRepository";
import { HttpCandidateContextRepository } from "../features/candidate-contexts/infrastructure/repositories/HttpCandidateContextRepository";
import {
  HttpJobRepository,
  HttpAnalysisRepository,
} from "../features/jobs/infrastructure/repositories/HttpJobRepository";
import type { UserRepository } from "../features/users/domain/contracts/UserRepository";
import type { CandidateContextRepository } from "../features/candidate-contexts/domain/contracts/CandidateContextRepository";
import type {
  JobRepository,
  AnalysisRepository,
} from "../features/jobs/domain/contracts/JobRepository";
export const repositories: {
  users: UserRepository;
  contexts: CandidateContextRepository;
  jobs: JobRepository;
  analyses: AnalysisRepository;
} = {
  users: new HttpUserRepository(),
  contexts: new HttpCandidateContextRepository(),
  jobs: new HttpJobRepository(),
  analyses: new HttpAnalysisRepository(),
};
