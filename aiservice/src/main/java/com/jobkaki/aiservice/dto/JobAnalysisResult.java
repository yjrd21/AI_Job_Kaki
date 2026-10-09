package com.jobkaki.aiservice.dto;

import com.jobkaki.aiservice.model.RequirementMatch;
import java.util.List;

// Structured analysis returned by the language model before persistence.
public record JobAnalysisResult(
        String companyContext,
        String roleTitle,
        String applicationDeadline,
        String salaryRange,
        List<String> redFlags,
        List<RequirementMatch> requirements,
        String matchSummary,
        List<String> questionsToClarify) {
}
