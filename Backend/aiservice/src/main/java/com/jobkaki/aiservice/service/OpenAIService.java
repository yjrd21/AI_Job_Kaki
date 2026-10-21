package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.dto.JobAnalysisResult;
import com.jobkaki.aiservice.dto.JobAnalysisRequest.CandidateContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Base64;
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
        this.webClient = webClientBuilder.clone()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
        this.model = model;
        this.objectMapper = objectMapper;
    }

    // Request and deserialize an analysis that conforms to the declared JSON schema.
    public JobAnalysisResult getAnalysis(String prompt, CandidateContext candidate) {
        if (prompt == null || prompt.isBlank()) {
            throw new RuntimeException("Prompt cannot be null or empty");
        }

        validateCv(candidate);
        var content = List.of(
                Map.of("type", "input_file", "filename", candidate.cvFileName(),
                        "file_data", "data:" + candidate.cvContentType() + ";base64,"
                                + Base64.getEncoder().encodeToString(candidate.cvFile())),
                Map.of("type", "input_text", "text", prompt));
        JsonNode response = webClient.post()
                .uri("/responses")
                .bodyValue(Map.of(
                        "model", model,
                        "input", List.of(Map.of("role", "user", "content", content)),
                        "text", Map.of("format", structuredOutputFormat()),
                        "tools", List.of(Map.of("type", "web_search", "filters",
                                Map.of("allowed_domains", CompanyReviewEvidenceValidator.DOMAINS))),
                        "tool_choice", "required",
                        "include", List.of("web_search_call.action.sources")))
                .retrieve()
                .onStatus(status -> status.isError(), clientResponse -> {
                    log.warn("OpenAI request failed with status {}", clientResponse.statusCode());
                    return clientResponse.releaseBody().then(Mono.error(new AnalysisException(
                            "AI_SERVICE_UNAVAILABLE", "The AI service is temporarily unavailable. Please try again later.")));
                })
                .bodyToMono(JsonNode.class)
                .block(Duration.ofSeconds(150));

        if (response == null || !"completed".equals(response.path("status").asString())) {
            throw new AnalysisException("AI_RESPONSE_INCOMPLETE", "The AI service did not complete this evaluation. Please try again.");
        }
        String answer = extractOutputText(response);

        if (answer == null || answer.isBlank()) {
            log.error("OpenAI response did not contain an output_text content item");
            throw new AnalysisException("AI_RESULT_INVALID", "The AI service returned no usable evaluation. Please try again.");
        }

        try {
            JobAnalysisResult result = objectMapper.readValue(answer, JobAnalysisResult.class);
            return new JobAnalysisResult(result.jobInformationSufficient(), result.candidateInformationSufficient(),
                    result.roleOverview(), result.roleTitle(), result.applicationDeadline(), result.salaryRange(),
                    result.redFlags(), CompanyReviewEvidenceValidator.validate(response, result.companyReviews()),
                    result.requirements(), result.matchSummary(), result.questionsToClarify());
        } catch (RuntimeException exception) {
            throw new AnalysisException("AI_RESULT_INVALID", "The AI service returned an invalid evaluation. Please try again.");
        }
    }

    private void validateCv(CandidateContext candidate) {
        if (candidate == null || candidate.cvFile() == null || candidate.cvFile().length == 0) {
            throw new AnalysisException("CV_MISSING", "Upload a CV to your candidate profile and submit the job again.");
        }
        if (candidate.cvFile().length > 5 * 1024 * 1024) {
            throw new AnalysisException("CV_TOO_LARGE", "Your CV must not exceed 5 MiB. Upload a smaller file.");
        }
        String name = candidate.cvFileName() == null ? "" : candidate.cvFileName().toLowerCase(java.util.Locale.ROOT);
        boolean supported = (name.endsWith(".pdf") && "application/pdf".equals(candidate.cvContentType()))
                || (name.endsWith(".doc") && "application/msword".equals(candidate.cvContentType()))
                || (name.endsWith(".docx") && "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(candidate.cvContentType()));
        if (!supported) {
            throw new AnalysisException("CV_FORMAT_UNSUPPORTED", "Upload your CV as a PDF, DOC, or DOCX file.");
        }
    }

    private Map<String, Object> structuredOutputFormat() {
        Map<String, Object> requirementSchema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "requirement", Map.of("type", "string"),
                        "status", Map.of(
                                "type", "string",
                                "enum", List.of("MET", "PARTIALLY_MET", "NOT_MET", "UNKNOWN")),
                        "explanation", Map.of("type", "string", "description",
                                "Explain the assessment using specific supporting or conflicting CV evidence. "
                                        + "For UNKNOWN, identify the missing evidence. Do not simply restate the requirement.")),
                "required", List.of("requirement", "status", "explanation"),
                "additionalProperties", false);

        return Map.of(
                "type", "json_schema",
                "name", "job_analysis",
                "strict", true,
                "schema", Map.of(
                        "type", "object",
                        "properties", Map.ofEntries(
                                Map.entry("jobInformationSufficient", Map.of("type", "boolean")),
                                Map.entry("candidateInformationSufficient", Map.of("type", "boolean")),
                                Map.entry("roleOverview", Map.of(
                                        "type", List.of("string", "null"),
                                        "description", "One neutral paragraph of 3-5 sentences summarizing the job, "
                                                + "team or product purpose, main responsibilities, and minimum qualifications "
                                                + "from the supplied posting. Summarize available details without inventing "
                                                + "missing information or assessing the candidate. Null only when the role "
                                                + "cannot be described from the supplied information.")),
                                Map.entry("roleTitle", nullableStringSchema()),
                                Map.entry("applicationDeadline", nullableStringSchema()),
                                Map.entry("salaryRange", nullableStringSchema()),
                                Map.entry("redFlags", Map.of("type", "array", "items", Map.of("type", "string"))),
                                Map.entry("companyReviews", CompanyReviewEvidenceValidator.schema()),
                                Map.entry("requirements", Map.of("type", "array", "items", requirementSchema)),
                                Map.entry("matchSummary", Map.of("type", "string")),
                                Map.entry("questionsToClarify", Map.of("type", "array", "items", Map.of("type", "string")))),
                        "required", List.of(
                                "jobInformationSufficient",
                                "candidateInformationSufficient",
                                "roleOverview",
                                "roleTitle",
                                "applicationDeadline",
                                "salaryRange",
                                "redFlags",
                                "companyReviews",
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
