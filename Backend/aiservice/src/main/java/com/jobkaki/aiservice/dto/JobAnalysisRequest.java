package com.jobkaki.aiservice.dto;

import java.util.List;
import java.util.UUID;

// Represents the job and candidate data received from Job Service for analysis.
public record JobAnalysisRequest(
        UUID jobSubmissionId,
        UUID userId,
        String submissionType,
        String jobContext,
        CandidateContext candidateContext) {

    // Represents the candidate context needed to personalize the job analysis.
    public record CandidateContext(
            UUID id,
            UUID userId,
            String cvFileName,
            List<String> targetRoles,
            List<String> preferences,
            List<String> redFlags) {
    }
}
