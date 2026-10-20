// Represent a saved candidate profile with career preferences and a CV reference.
export interface CandidateContext {
  id: string;
  userId: string;
  cvFileName: string | null;
  targetRoles: string[];
  preferences: string[];
  redFlags: string[];
  createdAt: string;
  updatedAt: string;
}

// Define the preferences and optional CV content accepted when saving a profile.
export interface CandidateContextInput {
  cvFile?: string | null;
  cvFileName?: string | null;
  targetRoles: string[];
  preferences: string[];
  redFlags: string[];
}
