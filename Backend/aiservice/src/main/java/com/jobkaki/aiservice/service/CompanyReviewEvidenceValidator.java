package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.model.CompanyReviews;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;

// Validate review evidence from the same response as the candidate assessment.
final class CompanyReviewEvidenceValidator {
    static final List<String> DOMAINS = List.of("glassdoor.com", "glassdoor.sg", "glassdoor.co.uk");
    private CompanyReviewEvidenceValidator() {}

    static CompanyReviews validate(JsonNode response, CompanyReviews reviews) {
        if (response == null || !"completed".equals(response.path("status").asString())) {
            return CompanyReviews.unavailable();
        }
        boolean searched = false;
        Set<String> sources = new HashSet<>();
        for (JsonNode item : response.path("output")) {
            if ("web_search_call".equals(item.path("type").asString())
                    && "completed".equals(item.path("status").asString())) {
                searched = true;
                for (JsonNode source : item.path("action").path("sources")) {
                    addSource(sources, source.path("url").asString());
                }
            }
            for (JsonNode content : item.path("content")) {
                if ("output_text".equals(content.path("type").asString())) {
                    for (JsonNode annotation : content.path("annotations")) {
                        if ("url_citation".equals(annotation.path("type").asString())) {
                            addSource(sources, annotation.path("url").asString());
                        }
                    }
                }
            }
        }
        if (!searched) return CompanyReviews.unavailable();
        if (reviews == null || reviews.status() == null || reviews.concerns() == null) {
            return CompanyReviews.unavailable();
        }
        if (reviews.status() != CompanyReviews.Status.FOUND) {
            // An empty search is not evidence that there are no concerns.
            if (reviews.status() == CompanyReviews.Status.NO_RELEVANT_FINDINGS && sources.isEmpty()) {
                return CompanyReviews.unavailable();
            }
            return new CompanyReviews(reviews.status(), List.of());
        }
        var supported = reviews.concerns().stream()
                .filter(concern -> concern != null && concern.summary() != null && !concern.summary().isBlank()
                        && concern.scope() != null && sources.contains(concern.sourceUrl()))
                .toList();
        return supported.isEmpty() ? CompanyReviews.unavailable()
                : new CompanyReviews(CompanyReviews.Status.FOUND, supported);
    }

    private static void addSource(Set<String> sources, String url) {
        if (url == null) return;
        try {
            URI uri = URI.create(url);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getUserInfo() == null
                    && DOMAINS.stream().anyMatch(domain -> host.equals(domain) || host.endsWith("." + domain))) {
                sources.add(url);
            }
        } catch (IllegalArgumentException ignored) {
            // Malformed provider sources cannot support a displayed concern.
        }
    }

    static Map<String, Object> schema() {
        var concern = Map.of("type", "object", "properties", Map.of(
                "summary", Map.of("type", "string"),
                "sourceUrl", Map.of("type", "string"),
                "scope", Map.of("type", "string", "enum", List.of("COMPANY", "ROLE"))),
                "required", List.of("summary", "sourceUrl", "scope"), "additionalProperties", false);
        return Map.of("type", "object", "properties", Map.of(
                        "status", Map.of("type", "string", "enum", List.of("FOUND", "NO_RELEVANT_FINDINGS", "UNAVAILABLE")),
                        "concerns", Map.of("type", "array", "items", concern)),
                        "required", List.of("status", "concerns"), "additionalProperties", false);
    }
}
