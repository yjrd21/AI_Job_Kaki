package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpCandidateContextProvider implements CandidateContextProvider {
    @Value("${services.user.base-url}")
    private String baseUrl;

    // Retrieve a candidate context from the User Service over HTTP.
    public CandidateContextResponse get(
            UUID userId,
            UUID contextId) {
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                .build()
                .get()
                .uri(
                        "/internal/users/{userId}/candidate-contexts/{contextId}/analysis-context",
                        userId,
                        contextId)
                .retrieve()
                .body(CandidateContextResponse.class);
    }
}
