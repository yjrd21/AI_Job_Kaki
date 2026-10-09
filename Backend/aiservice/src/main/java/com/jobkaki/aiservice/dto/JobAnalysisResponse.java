package com.jobkaki.aiservice.dto;

import com.jobkaki.aiservice.model.RequirementMatch;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Represents the completed job analysis returned to API clients.
public record JobAnalysisResponse(
        UUID id,
        UUID jobSubmissionId,
        String companyContext,
        String roleTitle,
        String applicationDeadline,
        String salaryRange,
        List<String> redFlags,
        List<RequirementMatch> requirements,
        String matchSummary,
        List<String> questionsToClarify,
        LocalDateTime createdAt) {
}
