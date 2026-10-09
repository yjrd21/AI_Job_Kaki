import type {JobSubmission,JobSubmissionInput,JobAnalysis} from '../models/Job';
export interface JobRepository {list(userId:string):Promise<JobSubmission[]>;get(userId:string,jobId:string):Promise<JobSubmission>;submit(userId:string,input:JobSubmissionInput):Promise<JobSubmission>;delete(userId:string,jobId:string):Promise<void>}
export interface AnalysisRepository {get(analysisId:string):Promise<JobAnalysis>}
