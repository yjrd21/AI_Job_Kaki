// Define whether a job is submitted as pasted text or a URL.
export type JobSubmissionType = "TEXT" | "URL";

// Describe the processing states returned for a job submission.
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

// Describe how strongly the candidate meets an individual requirement.
export type RequirementMatchStatus =
  "MET" | "PARTIALLY_MET" | "NOT_MET" | "UNKNOWN";

// Represent a submitted job, its processing state, and any analysis or failure reference.
export interface JobSubmission {
  id: string;
  userId: string;
  candidateContextId: string;
  submissionType: JobSubmissionType;
  jobContext: string;
  status: JobStatus;
  jobAnalysisId: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define the profile and job information required to submit an analysis request.
export interface JobSubmissionInput {
  candidateContextId: string;
  submissionType: JobSubmissionType;
  jobContext: string;
}

// Pair a job requirement with its match status and supporting explanation.
export interface RequirementMatch {
  requirement: string;
  status: RequirementMatchStatus;
  explanation: string;
}

// Represent the saved evaluation report displayed to the candidate.
export interface JobAnalysis {
  id: string;
  jobSubmissionId: string;
  roleOverview: string | null;
  roleTitle: string | null;
  applicationDeadline: string | null;
  salaryRange: string | null;
  redFlags: string[];
  requirements: RequirementMatch[];
  matchSummary: string;
  questionsToClarify: string[];
  createdAt: string;
}
