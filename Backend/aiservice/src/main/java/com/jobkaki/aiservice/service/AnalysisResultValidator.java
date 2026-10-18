package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.dto.JobAnalysisResult;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class AnalysisResultValidator {
    private static final Pattern PLACEHOLDER = Pattern.compile(
            "(?i)(requirements? (?:retrievable|unavailable|unknown|not (?:available|provided|specified))"
            + "|(?:retrieve|access|extract).{0,40}(?:url|posting|requirements?)"
            + "|(?:url|posting|description).{0,40}(?:inaccessible|unavailable|not accessible|could not|cannot|couldn't)"
            + "|insufficient (?:job |public )?(?:information|details|content)|unable to (?:assess|determine|evaluate))");

    public void validate(JobAnalysisResult result) {
        if (result != null && !result.candidateInformationSufficient()) {
            throw new AnalysisException("CV_CONTENT_UNAVAILABLE",
                    "We couldn't read enough candidate information from your CV. Upload a readable PDF or Word CV and submit again.");
        }
        if (result == null || !result.jobInformationSufficient()
                || blank(result.roleTitle()) || blank(result.matchSummary())
                || placeholder(result.matchSummary())
                || result.requirements() == null || result.requirements().isEmpty()
                || result.redFlags() == null || result.questionsToClarify() == null
                || result.redFlags().stream().anyMatch(this::blank)
                || result.questionsToClarify().stream().anyMatch(this::blank)) {
            throw invalid();
        }
        for (var requirement : result.requirements()) {
            if (requirement == null || blank(requirement.getRequirement())
                    || requirement.getStatus() == null || blank(requirement.getExplanation())
                    || placeholder(requirement.getRequirement()) || placeholder(requirement.getExplanation())
                    || requirement.getRequirement().trim().toUpperCase(Locale.ROOT).matches("UNKNOWN|N/A|NONE|NOT PROVIDED")) {
                throw invalid();
            }
        }
        // UNKNOWN is valid for a real requirement when candidate evidence is missing.
        // Salary, deadline, and company context are optional.
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private boolean placeholder(String value) {
        return PLACEHOLDER.matcher(value).find();
    }

    private AnalysisException invalid() {
        return new AnalysisException("AI_RESULT_INVALID", "We couldn't produce a reliable evaluation from this job information. Please paste the full job description and try again.");
    }
}
