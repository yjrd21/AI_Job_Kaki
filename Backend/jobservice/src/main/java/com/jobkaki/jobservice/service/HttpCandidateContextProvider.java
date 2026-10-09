package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;
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
        return RestClient.builder()
                .baseUrl(baseUrl)
                .build()
                .get()
                .uri(
                        "/api/users/{userId}/candidate-contexts/{contextId}",
                        userId,
                        contextId)
                .retrieve()
                .body(CandidateContextResponse.class);
    }
}
