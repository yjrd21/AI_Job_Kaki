import type {CandidateContextRepository} from '../../domain/contracts/CandidateContextRepository';import type {CandidateContextInput} from '../../domain/models/CandidateContext';
export const listCandidateContexts=(r:CandidateContextRepository,userId:string)=>r.list(userId);
export const getCandidateContext=(r:CandidateContextRepository,userId:string,id:string)=>r.get(userId,id);
export const saveCandidateContext=(r:CandidateContextRepository,userId:string,p:CandidateContextInput,id?:string)=>id?r.update(userId,id,p):r.create(userId,p);
export const deleteCandidateContext=(r:CandidateContextRepository,userId:string,id:string)=>r.delete(userId,id);
