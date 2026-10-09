export interface CandidateContext {id:string;userId:string;cvFileName:string|null;targetRoles:string[];preferences:string[];redFlags:string[];createdAt:string;updatedAt:string}
export interface CandidateContextInput {cvFile?:string|null;cvFileName?:string|null;targetRoles:string[];preferences:string[];redFlags:string[]}
