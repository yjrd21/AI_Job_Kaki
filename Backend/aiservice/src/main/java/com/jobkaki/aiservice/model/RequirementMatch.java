package com.jobkaki.aiservice.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Represents how a candidate matches one requirement from a job.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequirementMatch {
    private String requirement;
    private RequirementMatchStatus status;
    private String explanation;
}
