package com.jobkaki.aiservice.model;

import java.util.List;

// External review findings remain distinct from facts in the advertised posting.
public record CompanyReviews(Status status, List<Concern> concerns) {
    public enum Status { FOUND, NO_RELEVANT_FINDINGS, UNAVAILABLE }
    public enum Scope { COMPANY, ROLE }
    public record Concern(String summary, String sourceUrl, Scope scope) {}

    public static CompanyReviews unavailable() {
        return new CompanyReviews(Status.UNAVAILABLE, List.of());
    }
}
