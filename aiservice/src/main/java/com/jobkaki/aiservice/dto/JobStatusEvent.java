package com.jobkaki.aiservice.dto;

import com.jobkaki.aiservice.model.JobStatus;
import java.util.UUID;

// Represents the asynchronous analysis status update sent back to Job Service.
public record JobStatusEvent(
        UUID jobSubmissionId,
        UUID jobAnalysisId,
        JobStatus status,
        String errorMessage) {
}
