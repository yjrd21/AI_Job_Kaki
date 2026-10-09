package com.jobkaki.gateway.user;
import com.jobkaki.gateway.dto.RegisterRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    private final WebClient UserServiceWebClient;

    public Mono<Boolean> validateKeyCloakUser(String keycloakId) {
        log.info("Calling User Validation API for keycloakId: {}", keycloakId);
            return UserServiceWebClient.get()
                    .uri("/api/users/{userId}/validate", keycloakId)
                    .retrieve()
                    .bodyToMono(Boolean.class)
                    .onErrorResume(WebClientResponseException.class, e -> {
                        if (e.getStatusCode() == HttpStatus.NOT_FOUND)
                            return Mono.error(new RuntimeException("User Not Found: " + keycloakId));
                        else if (e.getStatusCode() == HttpStatus.BAD_REQUEST)
                            return Mono.error(new RuntimeException("Invalid Request: " + keycloakId));
                        return Mono.error(new RuntimeException("Unexpected error: " + e.getMessage()));
                    });
        }

    public Mono<Void> createUser(RegisterRequest request) {
        log.info("Calling User Registration API for user: {}", request.getKeycloakId());
        return UserServiceWebClient.post()
                .uri("/api/users")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Void.class)
                .doOnSuccess(ignored -> log.info("User created successfully with Keycloak ID: {}", request.getKeycloakId()))
                .onErrorResume(WebClientResponseException.class, e -> {
                    if (e.getStatusCode() == HttpStatus.CONFLICT)
                        return Mono.error(new ResponseStatusException(HttpStatus.CONFLICT, "User identity conflict", e));
                    if (e.getStatusCode() == HttpStatus.BAD_REQUEST)
                        return Mono.error(new RuntimeException("Bad Request: " + e.getMessage()));
                    else if (e.getStatusCode() == HttpStatus.INTERNAL_SERVER_ERROR)
                        return Mono.error(new RuntimeException("Internal Server Error: " + e.getMessage()));
                    return Mono.error(new RuntimeException("Unexpected error: " + e.getMessage()));
                });
    }
}