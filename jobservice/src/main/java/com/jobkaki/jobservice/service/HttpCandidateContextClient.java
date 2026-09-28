package com.jobkaki.jobservice.service;
import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
@Component
public class HttpCandidateContextClient implements CandidateContextClient {
    @Value("${services.user.base-url:http://localhost:8081}") private String baseUrl;
    public CandidateContextResponse get(UUID userId, UUID contextId) {
        return RestClient.builder().baseUrl(baseUrl).build().get()
                .uri("/users/{userId}/candidate-contexts/{contextId}", userId, contextId)
                .retrieve().body(CandidateContextResponse.class);
    }
}
