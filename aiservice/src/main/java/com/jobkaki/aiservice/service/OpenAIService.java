package com.jobkaki.aiservice.service;

import tools.jackson.databind.JsonNode;
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

    public OpenAIService(
        WebClient.Builder webClientBuilder,
        @Value("${openai.api-key}") String apiKey,
        @Value("${openai.base-url}") String baseUrl,
        @Value("${openai.model}") String model
    ) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
        this.model = model;
    }

    // Send an analysis prompt to OpenAI and return the generated text.
    public String getAnswer(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            throw new RuntimeException("Prompt cannot be null or empty");
        }

        JsonNode response = webClient.post()
                .uri("/responses")
                .bodyValue(Map.of(
                        "model", model,
                        "input", prompt))
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

        if (answer == null) {
            log.error("OpenAI response did not contain an output_text content item");
            throw new RuntimeException("OpenAI response did not contain an output_text content item");
        }

        return answer;
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
