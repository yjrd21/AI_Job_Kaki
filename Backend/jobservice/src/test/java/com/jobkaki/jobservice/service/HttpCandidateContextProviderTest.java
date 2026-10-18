package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.CandidateContextResponse;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class HttpCandidateContextProviderTest {
    @Test
    void fetchesSelectedProfileAndOriginalCvThroughInternalApi() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID contextId = UUID.randomUUID();
        byte[] file = "%PDF-1.7 test".getBytes(StandardCharsets.UTF_8);
        var context = new CandidateContextResponse(contextId, userId, "cv.pdf", "application/pdf", file,
                List.of("Engineer"), List.of("Hybrid"), List.of(), null, null);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/internal/users/" + userId + "/candidate-contexts/" + contextId + "/analysis-context", exchange -> {
            byte[] body = new ObjectMapper().writeValueAsBytes(context);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            var provider = new HttpCandidateContextProvider();
            ReflectionTestUtils.setField(provider, "baseUrl", "http://127.0.0.1:" + server.getAddress().getPort());
            var result = provider.get(userId, contextId);
            assertEquals(contextId, result.id());
            assertEquals(userId, result.userId());
            assertArrayEquals(file, result.cvFile());
            assertEquals("application/pdf", result.cvContentType());
        } finally {
            server.stop(0);
        }
    }
}
