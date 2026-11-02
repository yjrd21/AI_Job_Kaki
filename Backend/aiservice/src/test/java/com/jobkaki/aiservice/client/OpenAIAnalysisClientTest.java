package com.jobkaki.aiservice.client;

import com.jobkaki.aiservice.service.AnalysisException;
import com.jobkaki.aiservice.service.AnalysisResultValidatorService;
import com.jobkaki.aiservice.model.CompanyReviews;
import java.util.Map;
import java.util.UUID;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicInteger;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import com.sun.net.httpserver.HttpServer;
import com.jobkaki.aiservice.dto.JobAnalysisRequest;
import tools.jackson.databind.JsonNode;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class OpenAIAnalysisClientTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private static final String GLASSDOOR_SOURCE = "https://www.glassdoor.sg/Reviews/Example-Reviews-E123.htm";
    private final JobAnalysisRequest.CandidateContext candidate = new JobAnalysisRequest.CandidateContext(
            UUID.randomUUID(), UUID.randomUUID(), "cv.pdf", "application/pdf", "%PDF-test CV".getBytes(StandardCharsets.UTF_8),
            List.of("Engineer"), List.of(), List.of(), null, null);

    private OpenAIAnalysisClient service(String status, String answer) {
        String response = mapper.writeValueAsString(Map.of("status", status,
                "output", List.of(Map.of("content", List.of(Map.of("type", "output_text", "text", answer))))));
        return new OpenAIAnalysisClient(WebClient.builder().exchangeFunction(request -> Mono.just(
                ClientResponse.create(HttpStatus.OK).header("Content-Type", "application/json").body(response).build())),
                "test-key", "https://example.test", "test-model", mapper);
    }

    private Map<String, Object> concern(String url) {
        return Map.of("summary", "A reviewer reported long working hours in 2025; team relevance is unclear.",
                "sourceUrl", url, "scope", "COMPANY");
    }

    private CompanyReviews reviewResult(String reviewStatus, List<Map<String, Object>> concerns,
            List<String> sourceUrls, boolean searchCompleted, List<Map<String, Object>> annotations) {
        Map<String, Object> analysis = new LinkedHashMap<>();
        analysis.put("jobInformationSufficient", true);
        analysis.put("candidateInformationSufficient", true);
        analysis.put("roleOverview", null);
        analysis.put("roleTitle", "Engineer");
        analysis.put("applicationDeadline", null);
        analysis.put("salaryRange", null);
        analysis.put("redFlags", List.of());
        analysis.put("companyReviews", Map.of("status", reviewStatus, "concerns", concerns));
        analysis.put("requirements", List.of());
        analysis.put("matchSummary", "The candidate's experience needs clarification.");
        analysis.put("questionsToClarify", List.of());

        String answer = mapper.writeValueAsString(analysis);
        Map<String, Object> outputText = Map.of(
                "type", "output_text", "text", answer, "annotations", annotations);
        Map<String, Object> search = Map.of(
                "type", "web_search_call",
                "status", searchCompleted ? "completed" : "failed",
                "action", Map.of("sources", sourceUrls.stream().map(url -> Map.of("url", url)).toList()));
        Map<String, Object> message = Map.of("type", "message", "content", List.of(outputText));
        String providerResponse = mapper.writeValueAsString(Map.of(
                "status", "completed", "output", List.of(search, message)));
        var client = new OpenAIAnalysisClient(WebClient.builder().exchangeFunction(request -> Mono.just(
                ClientResponse.create(HttpStatus.OK).header("Content-Type", "application/json")
                        .body(providerResponse).build())),
                "test-key", "https://example.test", "test-model", mapper);
        return client.getAnalysis("Evaluate and research", candidate).companyReviews();
    }

    @Test
    void parsesSufficiencyDecisionAndKeepsOptionalFieldsNullable() {
        var result = service("completed", """
                {"jobInformationSufficient":true,"candidateInformationSufficient":true,"roleOverview":null,"roleTitle":"Engineer",
                 "applicationDeadline":null,"salaryRange":null,"redFlags":[],"companyReviews":{"status":"UNAVAILABLE","concerns":[]},
                 "requirements":[{"requirement":"Java experience","status":"UNKNOWN",
                 "explanation":"The candidate's Java experience is not specified."}],
                 "matchSummary":"Java experience needs clarification.","questionsToClarify":[]}
                """).getAnalysis("Evaluate the supplied description", candidate);
        assertTrue(result.jobInformationSufficient());
        assertNull(result.salaryRange());
        assertNull(result.roleOverview());
        assertDoesNotThrow(() -> new AnalysisResultValidatorService().validate(result));
    }

    @Test
    void parsesRoleOverviewSeparatelyFromCandidateMatchSummary() {
        var result = service("completed", """
                {"jobInformationSufficient":true,"candidateInformationSufficient":true,
                 "roleOverview":"Build video creation tools across mobile and backend. Requires a CS degree and programming skills.",
                 "roleTitle":"Engineer","applicationDeadline":null,"salaryRange":null,"redFlags":[],"companyReviews":{"status":"UNAVAILABLE","concerns":[]},
                 "requirements":[],"matchSummary":"Candidate has relevant mobile experience.","questionsToClarify":[]}
                """).getAnalysis("Evaluate description", candidate);
        assertEquals("Build video creation tools across mobile and backend. Requires a CS degree and programming skills.",
                result.roleOverview());
        assertEquals("Candidate has relevant mobile experience.", result.matchSummary());
    }

    @Test
    void extractsCandidateAssessmentAndSourcedReviewsFromTheSameResponse() {
        String url = "https://www.glassdoor.com/Reviews/Example.htm";
        String answer = mapper.writeValueAsString(Map.ofEntries(
                Map.entry("jobInformationSufficient", true), Map.entry("candidateInformationSufficient", true),
                Map.entry("roleTitle", "Engineer"), Map.entry("roleOverview", "Build Java services."),
                Map.entry("redFlags", List.of()), Map.entry("requirements", List.of(Map.of(
                        "requirement", "Java", "status", "MET", "explanation", "CV lists Java experience."))),
                Map.entry("matchSummary", "Candidate has relevant Java experience."),
                Map.entry("questionsToClarify", List.of()),
                Map.entry("companyReviews", Map.of("status", "FOUND", "concerns", List.of(Map.of(
                        "summary", "A reviewer reported overtime.", "sourceUrl", url, "scope", "COMPANY"))))));
        String response = mapper.writeValueAsString(Map.of("status", "completed", "output", List.of(
                Map.of("type", "web_search_call", "status", "completed", "action",
                        Map.of("sources", List.of(Map.of("url", url)))),
                Map.of("type", "message", "content", List.of(Map.of("type", "output_text", "text", answer))))));
        AtomicInteger requests = new AtomicInteger();
        var service = new OpenAIAnalysisClient(WebClient.builder().exchangeFunction(request -> {
            requests.incrementAndGet();
            return Mono.just(ClientResponse.create(HttpStatus.OK).header("Content-Type", "application/json")
                    .body(response).build());
        }), "test-key", "https://example.test", "test-model", mapper);

        var result = service.getAnalysis("Evaluate and research", candidate);

        assertEquals(1, requests.get());
        assertEquals("Candidate has relevant Java experience.", result.matchSummary());
        assertEquals("MET", result.requirements().get(0).getStatus().name());
        assertEquals(url, result.companyReviews().concerns().get(0).sourceUrl());
    }

    @Test
    void onlyKeepsConcernsSupportedByActualGlassdoorSearchUrls() {
        var result = reviewResult("FOUND",
                List.of(concern(GLASSDOOR_SOURCE), concern("https://www.glassdoor.sg/Reviews/invented.htm")),
                List.of(GLASSDOOR_SOURCE), true, List.of());
        assertEquals(CompanyReviews.Status.FOUND, result.status());
        assertEquals(1, result.concerns().size());
        assertEquals(GLASSDOOR_SOURCE, result.concerns().get(0).sourceUrl());
    }

    @Test
    void rejectsSpoofedUnsafeAndNonGlassdoorReviewSources() {
        for (String url : List.of("https://glassdoor.com.evil.test/review", "https://evilglassdoor.com/review",
                "javascript:alert(1)", "http://glassdoor.com/review", "https://user@glassdoor.com/review",
                "https://example.test/Reviews/review", "not a url")) {
            var result = reviewResult("FOUND", List.of(concern(url)), List.of(url), true, List.of());
            assertEquals(CompanyReviews.Status.UNAVAILABLE, result.status(), url);
        }
    }

    @Test
    void requiresCompletedSearchAndEvidenceForNoFindings() {
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                reviewResult("FOUND", List.of(concern(GLASSDOOR_SOURCE)), List.of(GLASSDOOR_SOURCE), false, List.of())
                        .status());
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                reviewResult("NO_RELEVANT_FINDINGS", List.of(), List.of(), true, List.of()).status());
        assertEquals(CompanyReviews.Status.NO_RELEVANT_FINDINGS,
                reviewResult("NO_RELEVANT_FINDINGS", List.of(), List.of(GLASSDOOR_SOURCE), true, List.of()).status());
        assertEquals(CompanyReviews.Status.UNAVAILABLE,
                reviewResult("UNAVAILABLE", List.of(), List.of(GLASSDOOR_SOURCE), true, List.of()).status());
    }

    @Test
    void acceptsValidGlassdoorCitationAnnotationsAsEvidence() {
        var annotations = List.of(Map.<String, Object>of("type", "url_citation", "url", GLASSDOOR_SOURCE));
        var result = reviewResult("FOUND", List.of(concern(GLASSDOOR_SOURCE)), List.of(), true, annotations);
        assertEquals(CompanyReviews.Status.FOUND, result.status());
        assertEquals(GLASSDOOR_SOURCE, result.concerns().get(0).sourceUrl());
    }

    @Test
    void incompleteResponsesAreRejectedEvenIfTheyContainText() {
        assertEquals("AI_RESPONSE_INCOMPLETE", assertThrows(AnalysisException.class,
                () -> service("incomplete", "{}").getAnalysis("Evaluate description", candidate)).code());
    }

    @Test
    void missingSufficiencyDecisionAndInvalidJsonAreRejected() {
        assertEquals("AI_RESULT_INVALID", assertThrows(AnalysisException.class,
                () -> service("completed", "{}").getAnalysis("Evaluate description", candidate)).code());
        assertEquals("AI_RESULT_INVALID", assertThrows(AnalysisException.class,
                () -> service("completed", "invalid JSON").getAnalysis("Evaluate description", candidate)).code());
    }

    @Test
    void upstreamErrorsHaveSafePublicCodesAndMessages() {
        var service = new OpenAIAnalysisClient(WebClient.builder().exchangeFunction(request -> Mono.just(
                ClientResponse.create(HttpStatus.TOO_MANY_REQUESTS).body("private response").build())),
                "test-key", "https://example.test", "test-model", mapper);
        var error = assertThrows(AnalysisException.class, () -> service.getAnalysis("Evaluate description", candidate));
        assertEquals("AI_SERVICE_UNAVAILABLE", error.code());
        assertFalse(error.getMessage().contains("private response"));
    }

    @Test
    void missingCvNeverCallsTheProvider() {
        var service = new OpenAIAnalysisClient(WebClient.builder().exchangeFunction(request -> {
            throw new AssertionError("Missing CV must not reach the provider");
        }), "test-key", "https://example.test", "test-model", mapper);
        assertEquals("CV_MISSING", assertThrows(AnalysisException.class,
                () -> service.getAnalysis("Evaluate description", null)).code());
    }

    @Test
    void sendsCvBytesAndPromptInOneStructuredResponsesRequest() throws Exception {
        AtomicReference<JsonNode> received = new AtomicReference<>();
        AtomicInteger requests = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/responses", exchange -> {
            requests.incrementAndGet();
            received.set(mapper.readTree(exchange.getRequestBody().readAllBytes()));
            byte[] response = "{\"status\":\"incomplete\",\"output\":[]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            var service = new OpenAIAnalysisClient(WebClient.builder(), "test-key",
                    "http://127.0.0.1:" + server.getAddress().getPort(), "test-model", mapper);
            for (String[] format : new String[][] {{"cv.pdf", "application/pdf"}, {"cv.doc", "application/msword"},
                    {"cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}}) {
                var document = new JobAnalysisRequest.CandidateContext(candidate.id(), candidate.userId(), format[0],
                        format[1], candidate.cvFile(), candidate.targetRoles(), List.of(), List.of(), null, null);
                assertThrows(AnalysisException.class, () -> service.getAnalysis("Job and candidate preferences", document));
                JsonNode body = received.get();
                assertEquals("test-model", body.path("model").asString());
                assertEquals("required", body.path("tool_choice").asString());
                assertEquals("web_search", body.path("tools").get(0).path("type").asString());
                assertEquals("glassdoor.com", body.path("tools").get(0).path("filters").path("allowed_domains").get(0).asString());
                assertEquals("web_search_call.action.sources", body.path("include").get(0).asString());
                assertTrue(body.path("text").path("format").path("schema").path("properties").has("companyReviews"));
                var content = body.path("input").get(0).path("content");
                assertEquals("input_file", content.get(0).path("type").asString());
                assertEquals(format[0], content.get(0).path("filename").asString());
                assertEquals("data:" + format[1] + ";base64," + Base64.getEncoder().encodeToString(candidate.cvFile()),
                        content.get(0).path("file_data").asString());
                assertEquals("Job and candidate preferences", content.get(1).path("text").asString());
                assertEquals("json_schema", body.path("text").path("format").path("type").asString());
                var schema = body.path("text").path("format").path("schema");
                assertTrue(schema.path("properties").has("roleOverview"));
                assertFalse(schema.path("properties").has("companyContext"));
                assertTrue(schema.path("properties").path("roleOverview").path("description").asString()
                        .contains("minimum qualifications"));
                assertTrue(body.path("text").path("format").path("schema").path("properties")
                        .has("candidateInformationSufficient"));
            }
            assertEquals(3, requests.get(), "Exactly one HTTP request per analysis, including web research");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void rejectsUnsupportedAndOversizedCvBeforeProviderCall() {
        var service = service("completed", "{}");
        var unsupported = new JobAnalysisRequest.CandidateContext(candidate.id(), candidate.userId(), "cv.exe",
                "application/octet-stream", candidate.cvFile(), List.of(), List.of(), List.of(), null, null);
        assertEquals("CV_FORMAT_UNSUPPORTED", assertThrows(AnalysisException.class,
                () -> service.getAnalysis("Evaluate description", unsupported)).code());
        var oversized = new JobAnalysisRequest.CandidateContext(candidate.id(), candidate.userId(), "cv.pdf",
                "application/pdf", new byte[5 * 1024 * 1024 + 1], List.of(), List.of(), List.of(), null, null);
        assertEquals("CV_TOO_LARGE", assertThrows(AnalysisException.class,
                () -> service.getAnalysis("Evaluate description", oversized)).code());
    }
}
