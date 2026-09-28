package com.fitness.jobservice.dto;
import com.fitness.jobservice.model.JobSubmissionType;
import java.util.UUID;
public record JobAnalysisRequest(UUID jobSubmissionId, UUID userId, JobSubmissionType submissionType,
                                 String jobContext, CandidateContextResponse candidateContext) {}
