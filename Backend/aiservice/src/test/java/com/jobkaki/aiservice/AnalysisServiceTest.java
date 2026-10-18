package com.jobkaki.aiservice;

import com.jobkaki.aiservice.dto.*;
import com.jobkaki.aiservice.model.*;
import com.jobkaki.aiservice.repository.JobAnalysisRepository;
import com.jobkaki.aiservice.service.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AnalysisServiceTest {
    private final JobAnalysisRepository repository = mock(JobAnalysisRepository.class);
    private final OpenAIService openAI = mock(OpenAIService.class);
    private final RabbitTemplate rabbit = mock(RabbitTemplate.class);
    private final MongoTemplate mongo = mock(MongoTemplate.class);
    private final JobContentResolver resolver = mock(JobContentResolver.class);
    private final AnalysisService service = new AnalysisService(repository, openAI, rabbit, resolver, new AnalysisResultValidator(), mongo);
    private final JobAnalysisRequest request = new JobAnalysisRequest(UUID.randomUUID(), UUID.randomUUID(), "URL",
            "https://www.linkedin.com/jobs/view/4459735599/", new JobAnalysisRequest.CandidateContext(
                    UUID.randomUUID(), UUID.randomUUID(), "cv.pdf", "application/pdf", "%PDF-test CV".getBytes(), List.of("Platform Engineer"),
                    List.of("Remote"), List.of("Unpaid trial"), null, null));

    AnalysisServiceTest() {
        ReflectionTestUtils.setField(service, "exchangeName", "jobs");
        ReflectionTestUtils.setField(service, "statusRoutingKey", "status");
    }

    private JobAnalysisResult result(boolean sufficient, List<RequirementMatch> requirements) {
        return new JobAnalysisResult(sufficient, true, "Example Co", "Principal Engineer", null, null, List.of(),
                requirements, "The role requires Java experience; the candidate's experience needs clarification.", List.of());
    }

    private JobAnalysisResult validResult() {
        return result(true, List.of(new RequirementMatch("Five years of Java experience", RequirementMatchStatus.UNKNOWN,
                "The candidate profile does not specify years of Java experience.")));
    }

    private List<JobStatusEvent> events() {
        var captor = ArgumentCaptor.forClass(JobStatusEvent.class);
        verify(rabbit, atLeastOnce()).convertAndSend(eq("jobs"), eq("status"), captor.capture());
        return captor.getAllValues();
    }

    @Test
    void successfulUrlAnalysisUsesResolvedContentAndPreservesUnknownAndMissingOptionalFields() {
        when(resolver.resolve("URL", request.jobContext())).thenReturn("Resolved job description with Java requirements");
        when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenReturn(validResult());
        service.analyze(request);
        var prompt = ArgumentCaptor.forClass(String.class);
        verify(openAI).getAnalysis(prompt.capture(), eq(request.candidateContext()));
        assertTrue(prompt.getValue().contains("Resolved job description with Java requirements"));
        assertFalse(prompt.getValue().contains(request.jobContext()));
        assertTrue(prompt.getValue().contains("Platform Engineer"));
        var saved = ArgumentCaptor.forClass(JobAnalysis.class);
        verify(repository).insert(saved.capture());
        assertEquals(request.jobSubmissionId(), saved.getValue().getId());
        assertEquals("Principal Engineer", saved.getValue().getRoleTitle());
        assertEquals("Example Co", saved.getValue().getCompanyContext());
        assertEquals(validResult().matchSummary(), saved.getValue().getMatchSummary());
        assertEquals(validResult().redFlags(), saved.getValue().getRedFlags());
        assertEquals(validResult().questionsToClarify(), saved.getValue().getQuestionsToClarify());
        assertEquals(RequirementMatchStatus.UNKNOWN, saved.getValue().getRequirements().get(0).getStatus());
        assertNull(saved.getValue().getSalaryRange());
        assertNull(saved.getValue().getApplicationDeadline());
        assertEquals(List.of(JobStatus.PROCESSING, JobStatus.COMPLETED), events().stream().map(event -> java.util.Objects.requireNonNull(event).status()).toList());
    }

    @Test
    void retrievalFailuresNeverCallAiOrSaveAnEvaluation() {
        for (String code : List.of("JOB_SOURCE_INACCESSIBLE", "JOB_CONTENT_INSUFFICIENT")) {
            reset(rabbit);
            doThrow(new AnalysisException(code, "Please paste the full job description."))
                    .when(resolver).resolve(anyString(), anyString());
            service.analyze(request);
            JobStatusEvent failure = events().get(events().size() - 1);
            assertEquals(JobStatus.FAILED, failure.status());
            assertEquals(code, failure.errorCode());
            assertNull(failure.jobAnalysisId());
        }
        verifyNoInteractions(openAI);
        verify(repository, never()).insert(any(JobAnalysis.class));
    }

    @Test
    void invalidResultsAreNotPersisted() {
        when(resolver.resolve(anyString(), anyString())).thenReturn("Resolved content");
        var placeholder = new RequirementMatch("Job requirements retrievable from the URL", RequirementMatchStatus.UNKNOWN,
                "The LinkedIn job posting could not be accessed.");
        for (JobAnalysisResult invalid : List.of(result(false, validResult().requirements()), result(true, List.of()),
                result(true, List.of(placeholder)))) {
            reset(rabbit);
            when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenReturn(invalid);
            service.analyze(request);
            assertEquals("AI_RESULT_INVALID", events().get(events().size() - 1).errorCode());
            assertNull(events().get(events().size() - 1).jobAnalysisId());
        }
        verify(repository, never()).insert(any(JobAnalysis.class));
    }

    @Test
    void duplicateDeliveryReusesPersistedResultWithoutCallingAiAgain() {
        when(resolver.resolve(anyString(), anyString())).thenReturn("Resolved content");
        when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenReturn(validResult());
        when(repository.insert(any(JobAnalysis.class))).thenAnswer(invocation -> {
            JobAnalysis saved = invocation.getArgument(0);
            when(repository.findByJobSubmissionId(request.jobSubmissionId())).thenReturn(Optional.of(saved));
            return saved;
        });
        service.analyze(request);
        service.analyze(request);
        verify(openAI, times(1)).getAnalysis(anyString(), eq(request.candidateContext()));
        verify(repository, times(1)).insert(any(JobAnalysis.class));
        assertEquals(JobStatus.COMPLETED, events().get(events().size() - 1).status());
    }

    @Test
    void concurrentDuplicateInsertUsesWinningAnalysis() {
        when(resolver.resolve(anyString(), anyString())).thenReturn("Resolved content");
        when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenReturn(validResult());
        JobAnalysis winner = new JobAnalysis();
        winner.setId(request.jobSubmissionId());
        when(repository.insert(any(JobAnalysis.class))).thenThrow(new DuplicateKeyException("duplicate"));
        when(repository.findById(request.jobSubmissionId())).thenReturn(Optional.of(winner));
        service.analyze(request);
        assertEquals(JobStatus.COMPLETED, events().get(events().size() - 1).status());
        assertEquals(winner.getId(), events().get(events().size() - 1).jobAnalysisId());
    }

    @Test
    void completionPublishFailureEscapesWithoutPublishingFailedAndRedeliveryReusesSavedResult() {
        when(resolver.resolve(anyString(), anyString())).thenReturn("Resolved content");
        when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenReturn(validResult());
        when(repository.insert(any(JobAnalysis.class))).thenAnswer(invocation -> {
            JobAnalysis saved = invocation.getArgument(0);
            when(repository.findByJobSubmissionId(request.jobSubmissionId())).thenReturn(Optional.of(saved));
            return saved;
        });
        doAnswer(invocation -> {
            JobStatusEvent event = invocation.getArgument(2);
            if (event.status() == JobStatus.COMPLETED) throw new IllegalStateException("broker unavailable");
            return null;
        }).when(rabbit).convertAndSend(eq("jobs"), eq("status"), any(JobStatusEvent.class));
        assertThrows(IllegalStateException.class, () -> service.analyze(request));
        assertTrue(events().stream().noneMatch(event -> event.status() == JobStatus.FAILED));
        reset(rabbit);
        service.analyze(request);
        verify(openAI, times(1)).getAnalysis(anyString(), eq(request.candidateContext()));
        assertEquals(JobStatus.COMPLETED, events().get(events().size() - 1).status());
    }

    @Test
    void providerErrorsExposeOnlySafeMessages() {
        when(resolver.resolve(anyString(), anyString())).thenReturn("Resolved content");
        when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenThrow(new IllegalStateException("private upstream response"));
        service.analyze(request);
        var failure = events().get(events().size() - 1);
        assertEquals("ANALYSIS_FAILED", failure.errorCode());
        assertFalse(failure.errorMessage().contains("private upstream"));
        verify(repository, never()).insert(any(JobAnalysis.class));
    }

    @Test
    void failedDeliveryIsRememberedAcrossRedeliveryWithoutCreatingAnEvaluation() {
        when(resolver.resolve(anyString(), anyString())).thenThrow(new AnalysisException(
                "JOB_SOURCE_INACCESSIBLE", "Please paste the full job description."));
        when(mongo.insert(any(AnalysisFailure.class))).thenAnswer(call -> {
            AnalysisFailure failure = call.getArgument(0);
            when(mongo.findById(request.jobSubmissionId(), AnalysisFailure.class)).thenReturn(failure);
            return failure;
        });
        service.analyze(request);
        service.analyze(request);
        verify(resolver, times(1)).resolve(anyString(), anyString());
        verifyNoInteractions(openAI);
        verify(repository, never()).insert(any(JobAnalysis.class));
        assertEquals(JobStatus.FAILED, events().get(events().size() - 1).status());
        assertNull(events().get(events().size() - 1).jobAnalysisId());
    }

    @Test
    void unreadableCvResultFailsWithoutPersistingAnEvaluation() {
        when(resolver.resolve(anyString(), anyString())).thenReturn("Resolved content");
        var valid = validResult();
        when(openAI.getAnalysis(anyString(), eq(request.candidateContext()))).thenReturn(
                new JobAnalysisResult(true, false, valid.companyContext(), valid.roleTitle(), null, null,
                        valid.redFlags(), valid.requirements(), valid.matchSummary(), valid.questionsToClarify()));
        service.analyze(request);
        var failure = events().get(events().size() - 1);
        assertEquals("CV_CONTENT_UNAVAILABLE", failure.errorCode());
        assertEquals(JobStatus.FAILED, failure.status());
        assertNull(failure.jobAnalysisId());
        verify(repository, never()).insert(any(JobAnalysis.class));
    }
}
