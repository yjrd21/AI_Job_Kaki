import type {JobRepository,AnalysisRepository} from '../../domain/contracts/JobRepository';import type {JobSubmissionInput} from '../../domain/models/Job';
export const submitJob=(repo:JobRepository,userId:string,input:JobSubmissionInput)=>repo.submit(userId,input);
export const listJobs=(repo:JobRepository,userId:string)=>repo.list(userId);
export const getJob=(repo:JobRepository,userId:string,jobId:string)=>repo.get(userId,jobId);
export const getAnalysis=(repo:AnalysisRepository,id:string)=>repo.get(id);
