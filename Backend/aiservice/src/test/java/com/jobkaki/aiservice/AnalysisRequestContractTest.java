package com.jobkaki.aiservice;

import com.jobkaki.aiservice.dto.JobAnalysisRequest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import static org.junit.jupiter.api.Assertions.*;

class AnalysisRequestContractTest {
    @Test
    void consumesProducerTypeHeaderAndCandidateSnapshotWithoutUserServiceLookup() {
        String json = """
                {"jobSubmissionId":"16563c0c-6ce1-425e-8b61-bf0b1a07c061",
                 "userId":"16563c0c-6ce1-425e-8b61-bf0b1a07c062","submissionType":"TEXT",
                 "jobContext":"Job description", "candidateContext":{
                  "id":"16563c0c-6ce1-425e-8b61-bf0b1a07c063",
                  "userId":"16563c0c-6ce1-425e-8b61-bf0b1a07c062",
                  "cvFileName":"cv.pdf","cvContentType":"application/pdf","cvFile":"%s",
                  "targetRoles":["Engineer"],"preferences":["Hybrid"],"redFlags":[],
                  "createdAt":"2026-10-17T07:57:37","updatedAt":"2026-10-17T07:57:37"}}
                """.formatted(Base64.getEncoder().encodeToString("%PDF-test CV".getBytes(StandardCharsets.UTF_8)));
        MessageProperties properties = new MessageProperties();
        properties.setContentType("application/json");
        properties.setHeader("__TypeId__", "com.jobkaki.jobservice.dto.JobAnalysisRequest");
        // Spring's listener supplies the inferred parameter type, overriding the producer's Java class name.
        properties.setInferredArgumentType(JobAnalysisRequest.class);
        var request = (JobAnalysisRequest) new JacksonJsonMessageConverter()
                .fromMessage(new Message(json.getBytes(StandardCharsets.UTF_8), properties));
        assertEquals("TEXT", request.submissionType());
        assertArrayEquals("%PDF-test CV".getBytes(StandardCharsets.UTF_8), request.candidateContext().cvFile());
        assertEquals("application/pdf", request.candidateContext().cvContentType());
        assertEquals("Hybrid", request.candidateContext().preferences().get(0));
        assertNotNull(request.candidateContext().updatedAt());
    }
}
