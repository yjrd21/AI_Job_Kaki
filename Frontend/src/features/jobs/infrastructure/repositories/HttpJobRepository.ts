import {httpClient} from '../../../../networks/client/httpClient';import {endpoints} from '../../../../networks/endpoints';import type {JobRepository,AnalysisRepository} from '../../domain/contracts/JobRepository';import type {JobSubmissionInput} from '../../domain/models/Job';import type {JobSubmissionResponseDto,JobAnalysisResponseDto} from '../dtos/job.dto';import {toJobSubmission,toJobAnalysis} from '../mappers/jobMapper';
export class HttpJobRepository implements JobRepository {
 async list(id:string){const r=await httpClient.get<JobSubmissionResponseDto[]>(endpoints.jobs(id));return r.data.map(toJobSubmission)}
 async get(id:string,jobId:string){const r=await httpClient.get<JobSubmissionResponseDto>(endpoints.job(id,jobId));return toJobSubmission(r.data)}
 async submit(id:string,input:JobSubmissionInput){const r=await httpClient.post<JobSubmissionResponseDto>(endpoints.jobs(id),input);return toJobSubmission(r.data)}
 async delete(id:string,jobId:string){await httpClient.delete(endpoints.job(id,jobId))}
}
export class HttpAnalysisRepository implements AnalysisRepository {async get(id:string){const r=await httpClient.get<JobAnalysisResponseDto>(endpoints.analysis(id));return toJobAnalysis(r.data)}}
