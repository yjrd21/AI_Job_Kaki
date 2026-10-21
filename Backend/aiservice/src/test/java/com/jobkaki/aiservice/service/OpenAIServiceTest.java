package com.jobkaki.aiservice.service;

import java.util.Map;
import java.util.UUID;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;
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

class OpenAIServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final JobAnalysisRequest.CandidateContext candidate = new JobAnalysisRequest.CandidateContext(
            UUID.randomUUID(), UUID.randomUUID(), "cv.pdf", "application/pdf", "%PDF-test CV".getBytes(StandardCharsets.UTF_8),
            List.of("Engineer"), List.of(), List.of(), null, null);

    private OpenAIService service(String status, String answer) {
        String response = mapper.writeValueAsString(Map.of("status", status,
                "output", List.of(Map.of("content", List.of(Map.of("type", "output_text", "text", answer))))));
        return new OpenAIService(WebClient.builder().exchangeFunction(request -> Mono.just(
                ClientResponse.create(HttpStatus.OK).header("Content-Type", "application/json").body(response).build())),
                "test-key", "https://example.test", "test-model", mapper);
    }

    @Test
    void parsesSufficiencyDecisionAndKeepsOptionalFieldsNullable() {
        var result = service("completed", """
                {"jobInformationSufficient":true,"candidateInformationSufficient":true,"roleOverview":null,"roleTitle":"Engineer",
                 "applicationDeadline":null,"salaryRange":null,"redFlags":[],
                 "requirements":[{"requirement":"Java experience","status":"UNKNOWN",
                 "explanation":"The candidate's Java experience is not specified."}],
                 "matchSummary":"Java experience needs clarification.","questionsToClarify":[]}
                """).getAnalysis("Evaluate the supplied description", candidate);
        assertTrue(result.jobInformationSufficient());
        assertNull(result.salaryRange());
        assertNull(result.roleOverview());
        assertDoesNotThrow(() -> new AnalysisResultValidator().validate(result));
    }

    @Test
    void parsesRoleOverviewSeparatelyFromCandidateMatchSummary() {
        var result = service("completed", """
                {"jobInformationSufficient":true,"candidateInformationSufficient":true,
                 "roleOverview":"Build video creation tools across mobile and backend. Requires a CS degree and programming skills.",
                 "roleTitle":"Engineer","applicationDeadline":null,"salaryRange":null,"redFlags":[],
                 "requirements":[],"matchSummary":"Candidate has relevant mobile experience.","questionsToClarify":[]}
                """).getAnalysis("Evaluate description", candidate);
        assertEquals("Build video creation tools across mobile and backend. Requires a CS degree and programming skills.",
                result.roleOverview());
        assertEquals("Candidate has relevant mobile experience.", result.matchSummary());
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
        var service = new OpenAIService(WebClient.builder().exchangeFunction(request -> Mono.just(
                ClientResponse.create(HttpStatus.TOO_MANY_REQUESTS).body("private response").build())),
                "test-key", "https://example.test", "test-model", mapper);
        var error = assertThrows(AnalysisException.class, () -> service.getAnalysis("Evaluate description", candidate));
        assertEquals("AI_SERVICE_UNAVAILABLE", error.code());
        assertFalse(error.getMessage().contains("private response"));
    }

    @Test
    void missingCvNeverCallsTheProvider() {
        var service = new OpenAIService(WebClient.builder().exchangeFunction(request -> {
            throw new AssertionError("Missing CV must not reach the provider");
        }), "test-key", "https://example.test", "test-model", mapper);
        assertEquals("CV_MISSING", assertThrows(AnalysisException.class,
                () -> service.getAnalysis("Evaluate description", null)).code());
    }

    @Test
    void sendsCvBytesAndPromptInOneStructuredResponsesRequest() throws Exception {
        AtomicReference<JsonNode> received = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/responses", exchange -> {
            received.set(mapper.readTree(exchange.getRequestBody().readAllBytes()));
            byte[] response = "{\"status\":\"incomplete\",\"output\":[]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();
        try {
            var service = new OpenAIService(WebClient.builder(), "test-key",
                    "http://127.0.0.1:" + server.getAddress().getPort(), "test-model", mapper);
            for (String[] format : new String[][] {{"cv.pdf", "application/pdf"}, {"cv.doc", "application/msword"},
                    {"cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}}) {
                var document = new JobAnalysisRequest.CandidateContext(candidate.id(), candidate.userId(), format[0],
                        format[1], candidate.cvFile(), candidate.targetRoles(), List.of(), List.of(), null, null);
                assertThrows(AnalysisException.class, () -> service.getAnalysis("Job and candidate preferences", document));
                JsonNode body = received.get();
                assertEquals("test-model", body.path("model").asString());
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
