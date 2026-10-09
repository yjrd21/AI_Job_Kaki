import type {JobSubmission,JobAnalysis} from '../../domain/models/Job';
import type {JobSubmissionResponseDto,JobAnalysisResponseDto} from '../dtos/job.dto';
// Identity mapping is deliberate: the domain currently exposes the backend fields 1:1.
// Introduce transformations here rather than changing views when schemas evolve.
export const toJobSubmission=(dto:JobSubmissionResponseDto):JobSubmission=>({...dto});
export const toJobAnalysis=(dto:JobAnalysisResponseDto):JobAnalysis=>({...dto,requirements:dto.requirements??[],redFlags:dto.redFlags??[],questionsToClarify:dto.questionsToClarify??[]});
