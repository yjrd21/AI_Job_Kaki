package com.jobkaki.aiservice.model;

import lombok.Data;

// Represents how a candidate matches one requirement from a job.
@Data
public class RequirementMatch {
    private String requirement;
    private RequirementMatchStatus status;
    private String explanation;

    public RequirementMatch() {
    }

    public RequirementMatch(String requirement, RequirementMatchStatus status, String explanation) {
        this.requirement = requirement;
        this.status = status;
        this.explanation = explanation;
    }
}
