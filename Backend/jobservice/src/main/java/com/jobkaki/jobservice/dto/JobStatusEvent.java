package com.jobkaki.jobservice.dto;

import com.jobkaki.jobservice.model.JobStatus;
import java.util.UUID;

// Represents the asynchronous analysis status update sent by the AI Service.
public record JobStatusEvent(
        UUID jobSubmissionId,
        UUID jobAnalysisId,
        JobStatus status,
        String errorMessage) {
}
