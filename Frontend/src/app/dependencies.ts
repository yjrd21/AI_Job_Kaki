import {env} from './config/env';import {mockStore} from './mocks/mockStore';
import {HttpUserRepository} from '../features/users/infrastructure/repositories/HttpUserRepository';
import {HttpCandidateContextRepository} from '../features/candidate-contexts/infrastructure/repositories/HttpCandidateContextRepository';
import {HttpJobRepository,HttpAnalysisRepository} from '../features/jobs/infrastructure/repositories/HttpJobRepository';
import type {UserRepository} from '../features/users/domain/contracts/UserRepository';
import type {CandidateContextRepository} from '../features/candidate-contexts/domain/contracts/CandidateContextRepository';
import type {JobRepository,AnalysisRepository} from '../features/jobs/domain/contracts/JobRepository';
export const repositories:{users:UserRepository;contexts:CandidateContextRepository;jobs:JobRepository;analyses:AnalysisRepository} = env.mock?{
 users:{get:mockStore.getUser,update:mockStore.updateUser,delete:mockStore.deleteUser},
 contexts:{list:mockStore.listContexts,get:mockStore.getContext,create:(u,p)=>mockStore.saveContext(u,p),update:(u,i,p)=>mockStore.saveContext(u,p,i),delete:mockStore.deleteContext},
 jobs:{list:mockStore.listJobs,get:mockStore.getJob,submit:mockStore.submitJob,delete:mockStore.deleteJob},
 analyses:{get:mockStore.getAnalysis}
}:{users:new HttpUserRepository(),contexts:new HttpCandidateContextRepository(),jobs:new HttpJobRepository(),analyses:new HttpAnalysisRepository()};
