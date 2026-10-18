package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.JobSubmissionResponse;
import com.jobkaki.jobservice.model.JobStatus;
import com.jobkaki.jobservice.model.JobSubmission;
import com.jobkaki.jobservice.model.JobSubmissionType;
import com.jobkaki.jobservice.repository.JobSubmissionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.mockito.ArgumentCaptor;
import com.jobkaki.jobservice.dto.JobStatusEvent;
import com.mongodb.client.result.UpdateResult;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JobServiceTest {
    @Test
    void listReturnsAllClientFacingSubmissionFields() {
        JobSubmissionRepository repository = mock(JobSubmissionRepository.class);
        JobService service = new JobService(
                repository,
                mock(CandidateContextProvider.class),
                mock(RabbitTemplate.class), mock(MongoTemplate.class));
        UUID userId = UUID.randomUUID();
        UUID candidateContextId = UUID.randomUUID();
        UUID jobAnalysisId = UUID.randomUUID();
        LocalDateTime createdAt = LocalDateTime.now().minusMinutes(1);
        LocalDateTime updatedAt = LocalDateTime.now();
        JobSubmission job = new JobSubmission();
        job.setId(UUID.randomUUID());
        job.setUserId(userId);
        job.setCandidateContextId(candidateContextId);
        job.setSubmissionType(JobSubmissionType.URL);
        job.setJobContext("https://example.com/jobs/123");
        job.setStatus(JobStatus.COMPLETED);
        job.setJobAnalysisId(jobAnalysisId);
        job.setCreatedAt(createdAt);
        job.setUpdatedAt(updatedAt);
        when(repository.findByUserId(userId)).thenReturn(List.of(job));

        JobSubmissionResponse response = service.list(userId).get(0);

        assertEquals(job.getId(), response.id());
        assertEquals(userId, response.userId());
        assertEquals(candidateContextId, response.candidateContextId());
        assertEquals(JobSubmissionType.URL, response.submissionType());
        assertEquals(job.getJobContext(), response.jobContext());
        assertEquals(JobStatus.COMPLETED, response.status());
        assertEquals(jobAnalysisId, response.jobAnalysisId());
        assertEquals(createdAt, response.createdAt());
        assertEquals(updatedAt, response.updatedAt());
    }

    @Test
    void failureInformationIsReturnedThroughExistingApi() {
        var repository = mock(JobSubmissionRepository.class);
        var service = new JobService(repository, mock(CandidateContextProvider.class),
                mock(RabbitTemplate.class), mock(MongoTemplate.class));
        UUID userId = UUID.randomUUID();
        JobSubmission job = new JobSubmission();
        job.setId(UUID.randomUUID());
        job.setUserId(userId);
        job.setStatus(JobStatus.FAILED);
        job.setErrorCode("JOB_SOURCE_INACCESSIBLE");
        job.setErrorMessage("Please paste the job description manually.");
        when(repository.findByIdAndUserId(job.getId(), userId)).thenReturn(java.util.Optional.of(job));
        var response = service.get(userId, job.getId());
        assertEquals(job.getErrorCode(), response.errorCode());
        assertEquals(job.getErrorMessage(), response.errorMessage());
        assertNull(response.jobAnalysisId());
    }

    @Test
    void statusUpdatesAtomicallyGuardTerminalStatesAndClearAnalysisIdOnFailure() {
        var mongo = mock(MongoTemplate.class);
        var service = new JobService(mock(JobSubmissionRepository.class), mock(CandidateContextProvider.class),
                mock(RabbitTemplate.class), mongo);
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq(JobSubmission.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));
        UUID submissionId = UUID.randomUUID();
        service.updateStatus(new JobStatusEvent(submissionId, UUID.randomUUID(), JobStatus.FAILED,
                "Please paste the job description.", "JOB_SOURCE_INACCESSIBLE"));
        var query = ArgumentCaptor.forClass(Query.class);
        var update = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(query.capture(), update.capture(), eq(JobSubmission.class));
        var criteria = query.getValue().getQueryObject();
        assertEquals(submissionId, criteria.get("id"));
        var allowed = ((org.bson.Document) criteria.get("status")).getList("$in", JobStatus.class);
        assertEquals(List.of(JobStatus.PENDING, JobStatus.PROCESSING), allowed);
        var fields = (org.bson.Document) update.getValue().getUpdateObject().get("$set");
        assertEquals(JobStatus.FAILED, fields.get("status"));
        assertNull(fields.get("jobAnalysisId"));
        assertEquals("JOB_SOURCE_INACCESSIBLE", fields.get("errorCode"));
        assertEquals("Please paste the job description.", fields.get("errorMessage"));
    }

    @Test
    void duplicateAndOutOfOrderStatusMessagesDoNotRegressTerminalStates() {
        var mongo = mock(MongoTemplate.class);
        var service = new JobService(mock(JobSubmissionRepository.class), mock(CandidateContextProvider.class),
                mock(RabbitTemplate.class), mongo);
        var stored = new java.util.concurrent.atomic.AtomicReference<>(JobStatus.PENDING);
        var analysisId = new java.util.concurrent.atomic.AtomicReference<UUID>();
        when(mongo.updateFirst(any(Query.class), any(Update.class), eq(JobSubmission.class))).thenAnswer(call -> {
            Query query = call.getArgument(0);
            var allowed = ((org.bson.Document) query.getQueryObject().get("status")).getList("$in", JobStatus.class);
            if (!allowed.contains(stored.get())) return UpdateResult.acknowledged(0, 0L, null);
            Update update = call.getArgument(1);
            var fields = (org.bson.Document) update.getUpdateObject().get("$set");
            stored.set((JobStatus) fields.get("status"));
            analysisId.set((UUID) fields.get("jobAnalysisId"));
            return UpdateResult.acknowledged(1, 1L, null);
        });
        UUID id = UUID.randomUUID();
        UUID evaluationId = UUID.randomUUID();
        service.updateStatus(new JobStatusEvent(id, evaluationId, JobStatus.COMPLETED, null, null));
        service.updateStatus(new JobStatusEvent(id, null, JobStatus.PROCESSING, null, null));
        service.updateStatus(new JobStatusEvent(id, null, JobStatus.FAILED, "late failure", "ANALYSIS_FAILED"));
        assertEquals(JobStatus.COMPLETED, stored.get());
        assertEquals(evaluationId, analysisId.get());
        stored.set(JobStatus.PENDING);
        service.updateStatus(new JobStatusEvent(id, null, JobStatus.FAILED, "failure", "ANALYSIS_FAILED"));
        service.updateStatus(new JobStatusEvent(id, null, JobStatus.PROCESSING, null, null));
        service.updateStatus(new JobStatusEvent(id, evaluationId, JobStatus.COMPLETED, null, null));
        assertEquals(JobStatus.FAILED, stored.get());
        assertNull(analysisId.get());
    }

    @Test
    void rejectsCompletedStatusWithoutAnAnalysisId() {
        var mongo = mock(MongoTemplate.class);
        var service = new JobService(mock(JobSubmissionRepository.class), mock(CandidateContextProvider.class),
                mock(RabbitTemplate.class), mongo);
        service.updateStatus(new JobStatusEvent(UUID.randomUUID(), null, JobStatus.COMPLETED, null, null));
        verifyNoInteractions(mongo);
    }
}
