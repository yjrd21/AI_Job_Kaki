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
                mock(RabbitTemplate.class));
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
}
