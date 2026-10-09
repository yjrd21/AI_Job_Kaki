// Mirrors JobSubmissionResponse and JobAnalysisResponse on the current Java backend.
// Keep this boundary synchronized with the backend; never derive a numeric match score.
import type {JobSubmission,JobAnalysis} from '../../domain/models/Job';
export type JobSubmissionResponseDto=JobSubmission;
export type JobAnalysisResponseDto=JobAnalysis;
