package com.jobkaki.jobservice.dto;

import com.jobkaki.jobservice.model.JobStatus;
import com.jobkaki.jobservice.model.JobSubmissionType;
import java.time.LocalDateTime;
import java.util.UUID;

// Represents the client-facing details and status of a job submission.
public record JobSubmissionResponse(
        UUID id,
        UUID userId,
        UUID candidateContextId,
        JobSubmissionType submissionType,
        String jobContext,
        JobStatus status,
        UUID jobAnalysisId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
