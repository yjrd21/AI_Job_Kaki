export const endpoints={
 users:'/api/users',user:(id:string)=>`/api/users/${encodeURIComponent(id)}`,
 contexts:(id:string)=>`/api/users/${encodeURIComponent(id)}/candidate-contexts`,
 context:(id:string,contextId:string)=>`/api/users/${encodeURIComponent(id)}/candidate-contexts/${encodeURIComponent(contextId)}`,
 jobs:(id:string)=>`/api/users/${encodeURIComponent(id)}/jobs`,
 job:(id:string,jobId:string)=>`/api/users/${encodeURIComponent(id)}/jobs/${encodeURIComponent(jobId)}`,
 analysis:(analysisId:string)=>`/api/job-analyses/${encodeURIComponent(analysisId)}`
};
