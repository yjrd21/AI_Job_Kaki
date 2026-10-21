package com.jobkaki.aiservice.dto;

import com.jobkaki.aiservice.model.RequirementMatch;
import com.jobkaki.aiservice.model.CompanyReviews;
import java.util.List;

// Structured analysis returned by the language model before persistence.
public record JobAnalysisResult(
        boolean jobInformationSufficient,
        boolean candidateInformationSufficient,
        String roleOverview,
        String roleTitle,
        String applicationDeadline,
        String salaryRange,
        List<String> redFlags,
        CompanyReviews companyReviews,
        List<RequirementMatch> requirements,
        String matchSummary,
        List<String> questionsToClarify) {
}
