package com.fitness.aiservice;

import com.fitness.aiservice.dto.JobAnalysisRequest;
import com.fitness.aiservice.service.AnalysisService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AnalysisServiceTest {
    @Test
    void promptIncludesJobAndCandidateContext() {
        var request = new JobAnalysisRequest(UUID.randomUUID(), UUID.randomUUID(), "TEXT",
                "Senior platform engineer", new JobAnalysisRequest.CandidateContext(
                        UUID.randomUUID(), UUID.randomUUID(), "cv.pdf", List.of("Platform Engineer"),
                        List.of("Remote"), List.of("Unpaid trial")));
        String prompt = new AnalysisService(null, null, null).buildPrompt(request);
        assertTrue(prompt.contains("Senior platform engineer"));
        assertTrue(prompt.contains("Platform Engineer"));
        assertTrue(prompt.contains("Unpaid trial"));
    }
}
