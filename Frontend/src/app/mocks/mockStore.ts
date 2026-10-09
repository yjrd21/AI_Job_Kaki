import type {User} from '../../features/users/domain/models/User';
import type {CandidateContext,CandidateContextInput} from '../../features/candidate-contexts/domain/models/CandidateContext';
import type {JobAnalysis,JobSubmission,JobSubmissionInput} from '../../features/jobs/domain/models/Job';
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
const MOCK_USER_ID='00000000-0000-4000-8000-000000000001';
const sampleUser:User={id:MOCK_USER_ID,keycloakId:MOCK_USER_ID,email:'demo@jobkaki.app',firstName:'Alex',lastName:'Tan',createdAt:now(),updatedAt:now()};
const contexts:CandidateContext[]=[{id:'00000000-0000-4000-8000-000000000002',userId:MOCK_USER_ID,cvFileName:'alex-tan-resume.pdf',targetRoles:['Product Manager','Business Analyst'],preferences:['Cross-functional collaboration','Hybrid or flexible work','Opportunities to develop product strategy'],redFlags:['Unpaid trial work','Unclear scope or expectations'],createdAt:now(),updatedAt:now()}];
const demoJobId='00000000-0000-4000-8000-000000000003';const demoAnalysisId='00000000-0000-4000-8000-000000000004';
const jobs:JobSubmission[]=[{id:demoJobId,userId:MOCK_USER_ID,candidateContextId:contexts[0].id,submissionType:'TEXT',jobContext:'Senior Backend Engineer — Java, Spring Boot, REST APIs and database experience within a distributed team.',status:'COMPLETED',jobAnalysisId:demoAnalysisId,createdAt:now(),updatedAt:now()}];
const analyses:JobAnalysis[]=[{id:demoAnalysisId,jobSubmissionId:demoJobId,companyContext:'A distributed engineering team building backend services. The employer was not identified in the posting.',roleTitle:'Senior Backend Engineer',applicationDeadline:null,salaryRange:null,redFlags:['Unclear responsibilities or expectations'],requirements:[{requirement:'Java and Spring Boot experience',status:'UNKNOWN',explanation:'The supplied candidate context does not establish demonstrated professional Java and Spring Boot experience.'},{requirement:'REST APIs and backend development',status:'PARTIALLY_MET',explanation:'The candidate preferences suggest an interest in technical product work, but the profile does not establish relevant engineering experience.'},{requirement:'Collaboration across a distributed team',status:'UNKNOWN',explanation:'The posting describes distributed collaboration, but the candidate context does not confirm past experience.'}],matchSummary:'This is a backend-focused senior engineering role. The supplied candidate context targets product and business roles, so there is not enough evidence to establish a strong technical fit. Clarify the expectations before deciding whether to apply.',questionsToClarify:['What are the primary responsibilities and seniority expectations?','Is the position open to candidates moving toward product roles?','What is the salary range and application deadline?'],createdAt:now()}];
const delay=async()=>new Promise<void>(r=>setTimeout(r,200));
const copy=<T>(x:T):T=>structuredClone(x);
export const mockIdentity={userId:MOCK_USER_ID,userName:'Alex Tan'};
export const mockStore={
 async getUser(_id:string){await delay();return copy(sampleUser)},
 async updateUser(_id:string,p:Partial<User>){Object.assign(sampleUser,p,{updatedAt:now()});await delay();return copy(sampleUser)},
 async deleteUser(){await delay();throw new Error('Account deletion is disabled in demo mode')},
 async listContexts(){await delay();return copy(contexts)},
 async getContext(_userId:string,contextId:string){await delay();const found=contexts.find(x=>x.id===contextId);if(!found)throw Error('Profile not found');return copy(found)},
 async saveContext(_userId:string,p:CandidateContextInput,contextId?:string){await delay();const found=contexts.find(x=>x.id===contextId);if(found){Object.assign(found,{targetRoles:p.targetRoles,preferences:p.preferences,redFlags:p.redFlags,cvFileName:p.cvFileName??found.cvFileName,updatedAt:now()});return copy(found)}const created:CandidateContext={id:id(),userId:MOCK_USER_ID,cvFileName:p.cvFileName||null,targetRoles:p.targetRoles,preferences:p.preferences,redFlags:p.redFlags,createdAt:now(),updatedAt:now()};contexts.push(created);return copy(created)},
 async deleteContext(_uid:string,contextId:string){await delay();const i=contexts.findIndex(x=>x.id===contextId);if(i>=0)contexts.splice(i,1)},
 async listJobs(){await delay();return copy(jobs)},
 async getJob(_uid:string,jobId:string){await delay();const x=jobs.find(j=>j.id===jobId);if(!x)throw Error('Job not found');return copy(x)},
 async submitJob(_uid:string,input:JobSubmissionInput){await delay();const newId=id();const analysisId=id();const job:JobSubmission={...input,id:newId,userId:MOCK_USER_ID,status:'COMPLETED',jobAnalysisId:analysisId,createdAt:now(),updatedAt:now()};jobs.unshift(job);analyses.unshift({...analyses[0],id:analysisId,jobSubmissionId:newId,roleTitle:input.submissionType==='URL'?'Job posting (demo analysis)':'Job posting (demo analysis)',companyContext:'Demo mode does not analyze the submitted posting. Connect the backend to obtain real results.',matchSummary:'This is illustrative analysis data generated locally for UI exploration. It is not an evaluation of your submitted job.',createdAt:now()});return copy(job)},
 async deleteJob(_uid:string,jobId:string){await delay();const i=jobs.findIndex(x=>x.id===jobId);if(i>=0)jobs.splice(i,1)},
 async getAnalysis(analysisId:string){await delay();const x=analyses.find(j=>j.id===analysisId);if(!x)throw Error('Analysis not found');return copy(x)}
};
