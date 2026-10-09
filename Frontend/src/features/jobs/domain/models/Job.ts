export type JobSubmissionType='TEXT'|'URL';
export type JobStatus='PENDING'|'PROCESSING'|'COMPLETED'|'FAILED';
export type RequirementMatchStatus='MET'|'PARTIALLY_MET'|'NOT_MET'|'UNKNOWN';
export interface JobSubmission {id:string;userId:string;candidateContextId:string;submissionType:JobSubmissionType;jobContext:string;status:JobStatus;jobAnalysisId:string|null;createdAt:string;updatedAt:string}
export interface JobSubmissionInput {candidateContextId:string;submissionType:JobSubmissionType;jobContext:string}
export interface RequirementMatch {requirement:string;status:RequirementMatchStatus;explanation:string}
export interface JobAnalysis {id:string;jobSubmissionId:string;companyContext:string|null;roleTitle:string|null;applicationDeadline:string|null;salaryRange:string|null;redFlags:string[];requirements:RequirementMatch[];matchSummary:string;questionsToClarify:string[];createdAt:string}
