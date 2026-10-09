package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.dto.JobAnalysisResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@Slf4j
public class OpenAIService {

    private final WebClient webClient;
    private final String model;
    private final ObjectMapper objectMapper;

    public OpenAIService(
        WebClient.Builder webClientBuilder,
        @Value("${openai.api-key}") String apiKey,
        @Value("${openai.base-url}") String baseUrl,
        @Value("${openai.model}") String model,
        ObjectMapper objectMapper
    ) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
        this.model = model;
        this.objectMapper = objectMapper;
    }

    // Request and deserialize an analysis that conforms to the declared JSON schema.
    public JobAnalysisResult getAnalysis(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            throw new RuntimeException("Prompt cannot be null or empty");
        }

        JsonNode response = webClient.post()
                .uri("/responses")
                .bodyValue(Map.of(
                        "model", model,
                        "input", prompt,
                        "text", Map.of("format", structuredOutputFormat())))
                .retrieve()
                .onStatus(
                        status -> status.isError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .defaultIfEmpty("No error body returned")
                                .flatMap(errorBody -> Mono.error(
                                        new IllegalStateException(
                                                "OpenAI request failed with status "
                                                        + clientResponse.statusCode()
                                                        + ": " + errorBody))))
                .bodyToMono(JsonNode.class)
                .block();

        String answer = extractOutputText(response);

        if (answer == null || answer.isBlank()) {
            log.error("OpenAI response did not contain an output_text content item");
            throw new RuntimeException("OpenAI response did not contain an output_text content item");
        }

        return objectMapper.readValue(answer, JobAnalysisResult.class);
    }

    private Map<String, Object> structuredOutputFormat() {
        Map<String, Object> requirementSchema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "requirement", Map.of("type", "string"),
                        "status", Map.of(
                                "type", "string",
                                "enum", List.of("MET", "PARTIALLY_MET", "NOT_MET", "UNKNOWN")),
                        "explanation", Map.of("type", "string")),
                "required", List.of("requirement", "status", "explanation"),
                "additionalProperties", false);

        return Map.of(
                "type", "json_schema",
                "name", "job_analysis",
                "strict", true,
                "schema", Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "companyContext", nullableStringSchema(),
                                "roleTitle", nullableStringSchema(),
                                "applicationDeadline", nullableStringSchema(),
                                "salaryRange", nullableStringSchema(),
                                "redFlags", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string")),
                                "requirements", Map.of(
                                        "type", "array",
                                        "items", requirementSchema),
                                "matchSummary", Map.of("type", "string"),
                                "questionsToClarify", Map.of(
                                        "type", "array",
                                        "items", Map.of("type", "string"))),
                        "required", List.of(
                                "companyContext",
                                "roleTitle",
                                "applicationDeadline",
                                "salaryRange",
                                "redFlags",
                                "requirements",
                                "matchSummary",
                                "questionsToClarify"),
                        "additionalProperties", false));
    }

    private Map<String, Object> nullableStringSchema() {
        return Map.of("type", List.of("string", "null"));
    }

    // Extract the first output_text content item from the OpenAI response.
    private String extractOutputText(JsonNode response) {
        if (response == null || !response.has("output")) {
            return null;
        }

        for (JsonNode outputItem : response.path("output")) {
            for (JsonNode contentItem : outputItem.path("content")) {
                if ("output_text".equals(contentItem.path("type").asString())
                        && contentItem.hasNonNull("text")) {
                    return contentItem.get("text").asString();
                }
            }
        }

        return null;
    }

}
