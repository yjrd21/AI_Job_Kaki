package com.jobkaki.gateway.config;

import com.jobkaki.gateway.dto.RegisterRequest;
import com.jobkaki.gateway.user.UserService;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
@RequiredArgsConstructor
public class KeyCloakUserSyncFilter implements WebFilter {
    private final UserService userService;

    // Matches /api/users/{id} or /api/users/{id}/..., capturing {id} in group 1
    private static final Pattern USER_PATH = Pattern.compile("^/api/users/([^/]+)(/.*)?$");

    // Intercepts requests to synchronize Keycloak users with the local Postgres database and enforce ownership rules
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        // CORS preflight requests carry no token, so let them through untouched
        if (HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod())) {
            return chain.filter(exchange);
        }

        // Extract user details from the Authorization header containing the JWT token
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");
        RegisterRequest registerRequest = getUserDetails(token);

        // The Keycloak subject (sub) is the user's identity; null when there is no valid token
        String userId = registerRequest != null ? registerRequest.getKeycloakId() : null;

        // If there is no valid Keycloak user ID, strip the X-User-ID header and continue
        // Downstream services will see the request without the X-User-ID header and treat it as an unauthenticated request
        if (userId == null) {
            ServerHttpRequest stripped = exchange.getRequest().mutate()
                    .headers(headers -> headers.remove("X-User-ID"))
                    .build();
            return chain.filter(exchange.mutate().request(stripped).build());
        }

        // Ownership filter: if the userId specified in the path does not match the authenticated user
        // from the JWT token, deny access
        Matcher matcher = USER_PATH.matcher(exchange.getRequest().getURI().getPath());
        if (matcher.matches() && !userId.equals(matcher.group(1))) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }

        // Check if the user exists in Postgres via the user service
        return userService.validateKeyCloakUser(userId)
                // If the user exists, do nothing; otherwise, create the user
                .flatMap(exists -> exists ? Mono.<Void>empty() : userService.createUser(registerRequest))
                .then(Mono.defer(() -> {
                    ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                            .headers(headers -> headers.set("X-User-ID", userId))
                            .build();
                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                }));
    }

    // Parses the bearer token and builds the user details used to create the user
    private RegisterRequest getUserDetails(String token) {
        // No header, or not a Bearer token: nothing to parse
        if (token == null || !token.startsWith("Bearer ")) {
            return null;
        }

        try {
            String tokenWithoutBearer = token.substring("Bearer ".length()).trim();
            SignedJWT signedJWT = SignedJWT.parse(tokenWithoutBearer);
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

            RegisterRequest registerRequest = new RegisterRequest();
            registerRequest.setEmail(claims.getStringClaim("email"));
            registerRequest.setKeycloakId(claims.getStringClaim("sub"));
            registerRequest.setPassword(UUID.randomUUID().toString());
            registerRequest.setFirstName(claims.getStringClaim("given_name"));
            registerRequest.setLastName(claims.getStringClaim("family_name"));
            return registerRequest;
        } catch (Exception e) {
            // Malformed token: log it and treat the request as unauthenticated here
            log.warn("Unable to read user details from the bearer token", e);
            return null;
        }
    }
}
