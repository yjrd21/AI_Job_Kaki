package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.client.CandidateContextClient;
import com.jobkaki.jobservice.dto.*;
import com.jobkaki.jobservice.model.*;
import com.jobkaki.jobservice.repository.JobSubmissionRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitOperations;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.ResourceAccessException;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class JobSubmissionCvTest {
    private final JobSubmissionRepository repository = mock(JobSubmissionRepository.class);
    private final CandidateContextClient client = mock(CandidateContextClient.class);
    private final RabbitOperations rabbit = mock(RabbitOperations.class);
    private final MessageConverter messageConverter = new JacksonJsonMessageConverter();
    private final JobService service = new JobService(
            repository, client, rabbit, mock(MongoOperations.class), messageConverter);
    private final UUID userId = UUID.randomUUID();
    private final UUID contextId = UUID.randomUUID();
    private final byte[] cv = "%PDF-1.7\nTest candidate CV".getBytes(StandardCharsets.UTF_8);

    JobSubmissionCvTest() {
        ReflectionTestUtils.setField(service, "exchangeName", "jobs");
        ReflectionTestUtils.setField(service, "analysisRoutingKey", "analysis");
    }

    private CandidateContextResponse context(String filename, String type, byte[] bytes) {
        return new CandidateContextResponse(contextId, userId, filename, type, bytes, List.of("Engineer"),
                List.of("Hybrid"), List.of("Unpaid trial"), null, null);
    }

    private JobSubmissionRequest request(JobSubmissionType type, String job) {
        return new JobSubmissionRequest(type, job, contextId);
    }

    @Test
    void publishesCvAndProfileSnapshotForBothSubmissionTypes() {
        when(client.get(userId, contextId)).thenReturn(context("cv.pdf", "application/pdf", cv));
        for (JobSubmissionType type : JobSubmissionType.values()) {
            var response = service.submit(userId, request(type, "Job input"));
            assertEquals(JobStatus.PENDING, response.status());
            assertNull(response.jobAnalysisId());
        }
        var captor = ArgumentCaptor.forClass(Message.class);
        verify(rabbit, times(2)).send(eq("jobs"), eq("analysis"), captor.capture());
        cv[10] = 0; // The queued bytes must remain the snapshot serialized before this change.
        for (Message message : captor.getAllValues()) {
            var json = new ObjectMapper().readTree(message.getBody());
            var candidate = json.path("candidateContext");
            assertEquals(contextId.toString(), candidate.path("id").asString());
            assertEquals(userId.toString(), candidate.path("userId").asString());
            assertEquals("application/pdf", candidate.path("cvContentType").asString());
            assertEquals("cv.pdf", candidate.path("cvFileName").asString());
            assertArrayEquals("%PDF-1.7\nTest candidate CV".getBytes(StandardCharsets.UTF_8),
                    java.util.Base64.getDecoder().decode(candidate.path("cvFile").asString()));
            assertEquals("Engineer", candidate.path("targetRoles").get(0).asString());
            assertEquals("application/json", message.getMessageProperties().getContentType());
        }
    }

    @Test
    void missingCvIsPersistedAsFailedWithoutPublishing() {
        when(client.get(userId, contextId)).thenReturn(context(null, "application/octet-stream", null));
        assertFailure(service.submit(userId, request(JobSubmissionType.TEXT, "Job")), "CV_MISSING");
        verifyNoInteractions(rabbit);
        var saved = ArgumentCaptor.forClass(JobSubmission.class);
        verify(repository, times(2)).save(saved.capture());
        assertEquals(JobStatus.FAILED, saved.getValue().getStatus());
        assertEquals("CV_MISSING", saved.getValue().getErrorCode());
    }

    @Test
    void inaccessibleProfileFailsWithoutPublishing() {
        when(client.get(userId, contextId)).thenThrow(new ResourceAccessException("private upstream information"));
        var response = service.submit(userId, request(JobSubmissionType.TEXT, "Job"));
        assertFailure(response, "CV_RETRIEVAL_FAILED");
        assertFalse(response.errorMessage().contains("private upstream"));
        verifyNoInteractions(rabbit);
    }

    @Test
    void wrongProfileOwnershipFailsWithoutPublishing() {
        when(client.get(userId, contextId)).thenReturn(new CandidateContextResponse(contextId, UUID.randomUUID(),
                "cv.pdf", "application/pdf", cv, List.of(), List.of(), List.of(), null, null));
        assertFailure(service.submit(userId, request(JobSubmissionType.TEXT, "Job")), "CANDIDATE_CONTEXT_UNAVAILABLE");
        verifyNoInteractions(rabbit);
    }

    @Test
    void rejectsOversizedUnsupportedAndMislabeledFiles() {
        for (Object[] invalid : new Object[][] {
                {"cv.pdf", "application/pdf", new byte[5 * 1024 * 1024 + 1], "CV_TOO_LARGE"},
                {"cv.exe", "application/octet-stream", cv, "CV_FORMAT_UNSUPPORTED"},
                {"cv.pdf", "application/msword", cv, "CV_FORMAT_UNSUPPORTED"},
                {"cv.pdf", "application/pdf", "not a PDF".getBytes(StandardCharsets.UTF_8), "CV_FILE_INVALID"}}) {
            when(client.get(userId, contextId)).thenReturn(context((String) invalid[0], (String) invalid[1], (byte[]) invalid[2]));
            assertFailure(service.submit(userId, request(JobSubmissionType.URL, "Job URL")), (String) invalid[3]);
        }
        verifyNoInteractions(rabbit);
    }

    @Test
    void acceptsWordSignaturesAndFiveMiBCv() {
        byte[] maxPdf = new byte[5 * 1024 * 1024];
        System.arraycopy(cv, 0, maxPdf, 0, cv.length);
        for (CandidateContextResponse candidate : List.of(context("cv.pdf", "application/pdf", maxPdf),
                context("cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        new byte[] {0x50, 0x4b, 0x03, 0x04}),
                context("cv.doc", "application/msword", new byte[] {(byte) 0xd0, (byte) 0xcf, 0x11, (byte) 0xe0,
                        (byte) 0xa1, (byte) 0xb1, 0x1a, (byte) 0xe1}))) {
            when(client.get(userId, contextId)).thenReturn(candidate);
            assertEquals(JobStatus.PENDING, service.submit(userId, request(JobSubmissionType.TEXT, "Job")).status());
        }
        var messages = ArgumentCaptor.forClass(Message.class);
        verify(rabbit, times(3)).send(eq("jobs"), eq("analysis"), messages.capture());
        assertTrue(messages.getAllValues().get(0).getBody().length < 8 * 1024 * 1024);
    }

    @Test
    void boundsTheActualSerializedMessage() {
        when(client.get(userId, contextId)).thenReturn(context("cv.pdf", "application/pdf", cv));
        assertFailure(service.submit(userId, request(JobSubmissionType.TEXT, "x".repeat(8 * 1024 * 1024))),
                "ANALYSIS_REQUEST_TOO_LARGE");
        verify(rabbit, never()).send(anyString(), anyString(), any(Message.class));
    }

    private void assertFailure(JobSubmissionResponse response, String code) {
        assertEquals(JobStatus.FAILED, response.status());
        assertEquals(code, response.errorCode());
        assertNotNull(response.errorMessage());
        assertNull(response.jobAnalysisId());
    }
}
