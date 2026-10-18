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
import java.util.Arrays;
import java.util.Locale;
import java.nio.charset.StandardCharsets;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.support.converter.MessageConversionException;
import org.springframework.web.client.RestClientException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {
        private static final int MAX_CV_BYTES = 5 * 1024 * 1024;
        private static final int MAX_REQUEST_BYTES = 8 * 1024 * 1024;
        private final JobSubmissionRepository repository;
        private final CandidateContextProvider candidateContextProvider;
        private final RabbitTemplate rabbit;
        private final MongoTemplate mongo;

        @Value("${rabbitmq.exchange.name}")
        private String exchangeName;

        @Value("${rabbitmq.routing.analysis-key}")
        private String analysisRoutingKey;

        // Persist a submission, assemble its candidate/CV snapshot, and publish it for analysis.
        public JobSubmissionResponse submit(UUID userId, JobSubmissionRequest request) {

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

                Message message;
                try {
                        CandidateContextResponse context = candidateContextProvider.get(userId, request.candidateContextId());
                        validateCandidate(context, userId, request.candidateContextId());
                        var analysisRequest = new JobAnalysisRequest(job.getId(), userId, job.getSubmissionType(),
                                        job.getJobContext(), context);
                        // Serialize once with the actual Rabbit converter so the bound includes base64 and all metadata.
                        message = rabbit.getMessageConverter().toMessage(analysisRequest, new MessageProperties());
                        if (message.getBody().length > MAX_REQUEST_BYTES) {
                                throw new SubmissionFailure("ANALYSIS_REQUEST_TOO_LARGE",
                                                "The analysis request is too large. Use a smaller CV or a shorter job description.");
                        }
                } catch (SubmissionFailure failure) {
                        return fail(job, failure.code, failure.getMessage());
                } catch (RestClientException exception) {
                        return fail(job, "CV_RETRIEVAL_FAILED",
                                        "We couldn't retrieve your candidate profile and CV. Please try again.");
                } catch (MessageConversionException exception) {
                        return fail(job, "ANALYSIS_REQUEST_INVALID", "We couldn't prepare this analysis request. Please try again.");
                }
                rabbit.send(exchangeName, analysisRoutingKey, message);
                log.info(
                                "Published job analysis request: jobSubmissionId={}, status={}",
                                job.getId(),
                                job.getStatus());
                
                // Return the job submission response to the client
                return response(job);
        }

        private void validateCandidate(CandidateContextResponse context, UUID userId, UUID contextId) {
                if (context == null || !userId.equals(context.userId()) || !contextId.equals(context.id())) {
                        throw new SubmissionFailure("CANDIDATE_CONTEXT_UNAVAILABLE", "The selected candidate profile is unavailable.");
                }
                byte[] file = context.cvFile();
                if (file == null || file.length == 0) {
                        throw new SubmissionFailure("CV_MISSING", "Upload a CV to your candidate profile before requesting an analysis.");
                }
                if (file.length > MAX_CV_BYTES) {
                        throw new SubmissionFailure("CV_TOO_LARGE", "Your CV must not exceed 5 MiB. Upload a smaller file.");
                }
                String name = context.cvFileName() == null ? "" : context.cvFileName().toLowerCase(Locale.ROOT);
                String type = context.cvContentType();
                boolean supported = (name.endsWith(".pdf") && "application/pdf".equals(type))
                                || (name.endsWith(".doc") && "application/msword".equals(type))
                                || (name.endsWith(".docx") && "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(type));
                if (!supported) {
                        throw new SubmissionFailure("CV_FORMAT_UNSUPPORTED", "Upload your CV as a PDF, DOC, or DOCX file.");
                }
                boolean signature = name.endsWith(".pdf")
                                ? new String(file, 0, Math.min(file.length, 1024), StandardCharsets.ISO_8859_1).contains("%PDF-")
                                : name.endsWith(".docx")
                                                ? startsWith(file, new byte[] {0x50, 0x4b, 0x03, 0x04})
                                                : startsWith(file, new byte[] {(byte) 0xd0, (byte) 0xcf, 0x11, (byte) 0xe0,
                                                                (byte) 0xa1, (byte) 0xb1, 0x1a, (byte) 0xe1});
                if (!signature) {
                        throw new SubmissionFailure("CV_FILE_INVALID", "Your CV does not match its file format. Upload a valid PDF or Word document.");
                }
        }

        private boolean startsWith(byte[] file, byte[] signature) {
                return file.length >= signature.length && Arrays.equals(Arrays.copyOf(file, signature.length), signature);
        }

        private JobSubmissionResponse fail(JobSubmission job, String code, String message) {
                job.setStatus(JobStatus.FAILED);
                job.setJobAnalysisId(null);
                job.setErrorCode(code);
                job.setErrorMessage(message);
                job.setUpdatedAt(LocalDateTime.now());
                repository.save(job);
                log.info("Job preparation failed: jobSubmissionId={}, errorCode={}", job.getId(), code);
                return response(job);
        }

        private static class SubmissionFailure extends RuntimeException {
                private final String code;
                private SubmissionFailure(String code, String message) {
                        super(message);
                        this.code = code;
                }
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

        // Atomic guards prevent late PROCESSING/FAILED messages from changing a terminal submission.
        public void updateStatus(JobStatusEvent event) {
                if (event.jobSubmissionId() == null || event.status() == null
                                || event.status() == JobStatus.PENDING
                                || (event.status() == JobStatus.COMPLETED && event.jobAnalysisId() == null)) {
                        log.warn("Ignoring invalid status event: {}", event);
                        return;
                }
                Query query = Query.query(Criteria.where("id").is(event.jobSubmissionId())
                                .and("status").in(JobStatus.PENDING, JobStatus.PROCESSING));
                Update update = new Update()
                                .set("status", event.status())
                                .set("jobAnalysisId", event.status() == JobStatus.COMPLETED ? event.jobAnalysisId() : null)
                                .set("errorCode", event.status() == JobStatus.FAILED
                                                ? (event.errorCode() == null ? "ANALYSIS_FAILED" : event.errorCode()) : null)
                                .set("errorMessage", event.status() == JobStatus.FAILED
                                                ? (event.errorMessage() == null ? "We couldn't complete this analysis. Please try again."
                                                                : event.errorMessage()) : null)
                                .set("updatedAt", LocalDateTime.now());
                var result = mongo.updateFirst(query, update, JobSubmission.class);
                if (result.getMatchedCount() == 0) {
                        log.info("Ignored status event for missing or terminal submission: jobSubmissionId={}, status={}",
                                        event.jobSubmissionId(), event.status());
                }
        }

        // Map a job submission entity to the response returned by the API.
        private JobSubmissionResponse response(JobSubmission job) {
                return new JobSubmissionResponse(
                                job.getId(),
                                job.getUserId(),
                                job.getCandidateContextId(),
                                job.getSubmissionType(),
                                job.getJobContext(),
                                job.getStatus(),
                                job.getJobAnalysisId(),
                                job.getCreatedAt(),
                                job.getUpdatedAt(),
                                job.getErrorCode(),
                                job.getErrorMessage());
        }
}
