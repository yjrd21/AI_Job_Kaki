package com.jobkaki.jobservice.service;

import com.jobkaki.jobservice.dto.CandidateContextResponse;
import com.jobkaki.jobservice.dto.JobAnalysisRequest;
import com.jobkaki.jobservice.dto.JobStatusEvent;
import com.jobkaki.jobservice.dto.JobSubmissionRequest;
import com.jobkaki.jobservice.dto.JobSubmissionResponse;
import com.jobkaki.jobservice.model.JobStatus;
import com.jobkaki.jobservice.model.JobSubmission;
import com.jobkaki.jobservice.repository.JobSubmissionRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {
        private final JobSubmissionRepository repository;
        private final CandidateContextProvider candidateContextProvider;
        private final RabbitTemplate rabbit;

        @Value("${rabbitmq.exchange.name}")
        private String exchangeName;

        @Value("${rabbitmq.routing.analysis-key}")
        private String analysisRoutingKey;

        // Validate the candidate context, persist the job, and publish it for analysis.
        public JobSubmissionResponse submit(UUID userId, JobSubmissionRequest request) {

                // Obtain the candidate context from an external User Service
                CandidateContextResponse context = candidateContextProvider.get(
                                userId,
                                request.candidateContextId());

                // Validate that the candidate context exists
                if (context == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "Candidate context unavailable");
                }

                // Create a new job submission 
                JobSubmission job = new JobSubmission();
                job.setId(UUID.randomUUID());
                job.setUserId(userId);
                job.setCandidateContextId(request.candidateContextId());
                job.setSubmissionType(request.submissionType());
                job.setJobContext(request.jobContext());
                job.setStatus(JobStatus.PENDING);
                job.setCreatedAt(LocalDateTime.now());
                job.setUpdatedAt(job.getCreatedAt());

                // Save job submission to the database
                repository.save(job);
                log.info(
                                "Created job submission: jobSubmissionId={}, userId={}, status={}",
                                job.getId(),
                                userId,
                                job.getStatus());

                // Send a message to the job analysis queue for processing
                rabbit.convertAndSend(
                                exchangeName,
                                analysisRoutingKey,
                                new JobAnalysisRequest(
                                                job.getId(),
                                                userId,
                                                job.getSubmissionType(),
                                                job.getJobContext(),
                                                context));
                log.info(
                                "Published job analysis request: jobSubmissionId={}, status={}",
                                job.getId(),
                                job.getStatus());
                
                // Return the job submission response to the client
                return response(job);
        }

        // Return all job submissions belonging to a user.
        public List<JobSubmissionResponse> list(UUID userId) {
                return repository.findByUserId(userId).stream()
                                .map(this::response)
                                .toList();
        }

        // Return a single job submission after verifying that it belongs to the user.
        public JobSubmissionResponse get(
                        UUID userId,
                        UUID id) {
                return response(
                                repository.findByIdAndUserId(id, userId)
                                                .orElseThrow(() -> new ResponseStatusException(
                                                                HttpStatus.NOT_FOUND,
                                                                "Job not found")));
        }

        // Delete a job submission after verifying that it belongs to the user.
        public void delete(
                        UUID userId,
                        UUID id) {
                get(userId, id);
                repository.deleteById(id);
        }

        // Apply an analysis status event to the stored job submission.
        public void updateStatus(JobStatusEvent event) {
                log.info(
                                "Received job status update: jobSubmissionId={}, jobAnalysisId={}, status={}, errorMessage={}",
                                event.jobSubmissionId(),
                                event.jobAnalysisId(),
                                event.status(),
                                event.errorMessage());
                repository.findById(event.jobSubmissionId())
                                .ifPresentOrElse(job -> {
                                        job.setStatus(event.status());
                                        job.setJobAnalysisId(event.jobAnalysisId());
                                        job.setUpdatedAt(LocalDateTime.now());
                                        repository.save(job);
                                        log.info(
                                                        "Updated job submission status: jobSubmissionId={}, jobAnalysisId={}, status={}",
                                                        job.getId(),
                                                        job.getJobAnalysisId(),
                                                        job.getStatus());
                                }, () -> {
                                        log.warn(
                                                        "Unable to update job status because submission was not found: jobSubmissionId={}",
                                                        event.jobSubmissionId());
                                });
        }

        // Map a job submission entity to the response returned by the API.
        private JobSubmissionResponse response(JobSubmission job) {
                return new JobSubmissionResponse(
                                job.getId(),
                                job.getStatus(),
                                job.getCreatedAt(),
                                job.getJobAnalysisId());
        }
}
