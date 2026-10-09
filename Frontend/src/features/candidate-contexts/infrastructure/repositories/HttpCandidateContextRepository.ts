import {httpClient} from '../../../../networks/client/httpClient';import {endpoints} from '../../../../networks/endpoints';import type {CandidateContextRepository} from '../../domain/contracts/CandidateContextRepository';import type {CandidateContext,CandidateContextInput} from '../../domain/models/CandidateContext';
export class HttpCandidateContextRepository implements CandidateContextRepository {
 async list(id:string){const r=await httpClient.get<CandidateContext[]>(endpoints.contexts(id));return r.data}
 async get(id:string,contextId:string){const r=await httpClient.get<CandidateContext>(endpoints.context(id,contextId));return r.data}
 async create(id:string,payload:CandidateContextInput){const r=await httpClient.post<CandidateContext>(endpoints.contexts(id),payload);return r.data}
 async update(id:string,contextId:string,payload:CandidateContextInput){const r=await httpClient.put<CandidateContext>(endpoints.context(id,contextId),payload);return r.data}
 async delete(id:string,contextId:string){await httpClient.delete(endpoints.context(id,contextId))}
}
