package com.jobkaki.jobservice.dto;

import com.jobkaki.jobservice.model.JobSubmissionType;
import java.util.UUID;

// Represents the job and candidate information published to the AI Service.
public record JobAnalysisRequest(
        UUID jobSubmissionId,
        UUID userId,
        JobSubmissionType submissionType,
        String jobContext,
        CandidateContextResponse candidateContext) {
}
