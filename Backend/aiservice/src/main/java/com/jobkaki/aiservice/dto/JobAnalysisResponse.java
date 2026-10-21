package com.jobkaki.aiservice.dto;

import com.jobkaki.aiservice.model.RequirementMatch;
import com.jobkaki.aiservice.model.CompanyReviews;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Represents the completed job analysis returned to API clients.
public record JobAnalysisResponse(
        UUID id,
        UUID jobSubmissionId,
        String roleOverview,
        String roleTitle,
        String applicationDeadline,
        String salaryRange,
        List<String> redFlags,
        CompanyReviews companyReviews,
        List<RequirementMatch> requirements,
        String matchSummary,
        List<String> questionsToClarify,
        LocalDateTime createdAt) {
}
