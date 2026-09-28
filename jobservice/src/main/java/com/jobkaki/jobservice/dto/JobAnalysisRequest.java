package com.jobkaki.jobservice.dto;
import com.jobkaki.jobservice.model.JobSubmissionType;
import java.util.UUID;
public record JobAnalysisRequest(UUID jobSubmissionId, UUID userId, JobSubmissionType submissionType,
                                 String jobContext, CandidateContextResponse candidateContext) {}
