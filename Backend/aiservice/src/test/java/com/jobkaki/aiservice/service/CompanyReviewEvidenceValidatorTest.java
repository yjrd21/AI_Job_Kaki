package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.model.CompanyReviews;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class CompanyReviewEvidenceValidatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String SOURCE = "https://www.glassdoor.sg/Reviews/Example-Reviews-E123.htm";

    private Map<String, Object> concern(String url) {
        return Map.of("summary", "A reviewer reported long working hours in 2025; team relevance is unclear.",
                "sourceUrl", url, "scope", "COMPANY");
    }

    private Map<String, Object> response(String status, List<Map<String, Object>> concerns, List<String> urls,
            boolean searched) {
        var text = Map.of("type", "output_text", "text",
                mapper.writeValueAsString(Map.of("status", status, "concerns", concerns)));
        var search = Map.of("type", "web_search_call", "status", searched ? "completed" : "failed", "action",
                Map.of("sources", urls.stream().map(url -> Map.of("url", url)).toList()));
        return Map.of("status", "completed", "output", List.of(search, Map.of("type", "message", "content", List.of(text))));
    }

    private CompanyReviews validate(Map<String, Object> response) {
        JsonNode json = mapper.valueToTree(response);
        String answer = json.path("output").get(1).path("content").get(0).path("text").asString();
        return CompanyReviewEvidenceValidator.validate(json, mapper.readValue(answer, CompanyReviews.class));
    }

    @Test
    void onlyDisplaysConcernsSupportedByActualGlassdoorSearchUrls() {
        var result = validate(response("FOUND", List.of(concern(SOURCE),
                concern("https://www.glassdoor.sg/Reviews/invented.htm")), List.of(SOURCE), true));
        assertEquals(CompanyReviews.Status.FOUND, result.status());
        assertEquals(1, result.concerns().size());
        assertEquals(SOURCE, result.concerns().get(0).sourceUrl());
        assertEquals(CompanyReviews.Scope.COMPANY, result.concerns().get(0).scope());
    }

    @Test
    void rejectsSpoofedUnsafeAndNonGlassdoorSources() {
        for (String url : List.of("https://glassdoor.com.evil.test/review", "https://evilglassdoor.com/review",
                "javascript:alert(1)", "http://glassdoor.com/review", "https://user@glassdoor.com/review",
                "https://example.test/Reviews/review", "not a url")) {
            assertEquals(CompanyReviews.Status.UNAVAILABLE,
                    validate(response("FOUND", List.of(concern(url)), List.of(url), true)).status());
        }
    }

    @Test
    void missingSearchAndEmptySearchAreNeverTreatedAsSuccessfulResearch() {
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                validate(response("FOUND", List.of(concern(SOURCE)), List.of(SOURCE), false)).status());
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                validate(response("NO_RELEVANT_FINDINGS", List.of(), List.of(), true)).status());
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                CompanyReviewEvidenceValidator.validate(mapper.valueToTree(Map.of("status", "incomplete")), CompanyReviews.unavailable()).status());
    }

    @Test
    void distinguishesAccessibleReviewsWithoutConcernsFromUnavailableEvidence() {
        assertEquals(CompanyReviews.Status.NO_RELEVANT_FINDINGS,
                validate(response("NO_RELEVANT_FINDINGS", List.of(), List.of(SOURCE), true)).status());
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                validate(response("UNAVAILABLE", List.of(), List.of(SOURCE), true)).status());
    }

    @Test
    void acceptsGlassdoorCitationAnnotationsAsSources() {
        var text = Map.of("type", "output_text", "text",
                mapper.writeValueAsString(Map.of("status", "FOUND", "concerns", List.of(concern(SOURCE)))),
                "annotations", List.of(Map.of("type", "url_citation", "url", SOURCE)));
        var response = Map.of("status", "completed", "output", List.of(
                Map.of("type", "web_search_call", "status", "completed"),
                Map.of("type", "message", "content", List.of(text))));
        assertEquals(CompanyReviews.Status.FOUND, validate(response).status());
    }

}
