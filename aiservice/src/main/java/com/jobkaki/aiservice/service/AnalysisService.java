package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.dto.JobAnalysisRequest;
import com.jobkaki.aiservice.dto.JobAnalysisResult;
import com.jobkaki.aiservice.dto.JobAnalysisResponse;
import com.jobkaki.aiservice.dto.JobStatusEvent;
import com.jobkaki.aiservice.model.JobAnalysis;
import com.jobkaki.aiservice.model.JobStatus;
import com.jobkaki.aiservice.repository.JobAnalysisRepository;
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
public class AnalysisService {
    private final JobAnalysisRepository repository;
    private final OpenAIService openAI;
    private final RabbitTemplate rabbit;

    @Value("${rabbitmq.exchange.name}")
    private String exchangeName;

    @Value("${rabbitmq.routing.status-key}")
    private String statusRoutingKey;

    // Analyze a job, persist the result, and publish the resulting status event.
    public void analyze(JobAnalysisRequest request) {
        log.info(
                "Received job analysis request: jobSubmissionId={}, userId={}",
                request.jobSubmissionId(),
                request.userId());
        publishStatus(
                request.jobSubmissionId(),
                null,
                JobStatus.PROCESSING,
                null);

        try {
            log.info(
                    "Processing job analysis: jobSubmissionId={}, status={}",
                    request.jobSubmissionId(),
                    JobStatus.PROCESSING);
            JobAnalysisResult result = openAI.getAnalysis(buildPrompt(request));
            JobAnalysis analysis = new JobAnalysis();
            analysis.setId(UUID.randomUUID());
            analysis.setJobSubmissionId(request.jobSubmissionId());
            analysis.setCompanyContext(result.companyContext());
            analysis.setRoleTitle(result.roleTitle());
            analysis.setApplicationDeadline(result.applicationDeadline());
            analysis.setSalaryRange(result.salaryRange());
            analysis.setRedFlags(result.redFlags());
            analysis.setRequirements(result.requirements());
            analysis.setMatchSummary(result.matchSummary());
            analysis.setQuestionsToClarify(result.questionsToClarify());
            analysis.setCreatedAt(LocalDateTime.now());
            repository.save(analysis);
            log.info(
                    "Persisted job analysis: jobSubmissionId={}, jobAnalysisId={}",
                    request.jobSubmissionId(),
                    analysis.getId());

            publishStatus(
                    request.jobSubmissionId(),
                    analysis.getId(),
                    JobStatus.COMPLETED,
                    null);
        } catch (Exception exception) {
            log.error(
                    "Job analysis failed: jobSubmissionId={}, status={}, error={}",
                    request.jobSubmissionId(),
                    JobStatus.FAILED,
                    exception.getMessage(),
                    exception);
            publishStatus(
                    request.jobSubmissionId(),
                    null,
                    JobStatus.FAILED,
                    exception.getMessage());
        }
    }

    // Build the prompt that combines job details with candidate preferences.
    public String buildPrompt(JobAnalysisRequest request) {
        JobAnalysisRequest.CandidateContext context = request.candidateContext();

        return "Analyze this job posting against the candidate information. "
                + "Return only the structured output requested by the response schema. "
                + "Extract roleTitle as the single advertised job title from the job context; "
                + "do not use or combine the candidate's target roles as the advertised title. "
                + "Use null for company context, role title, deadline, or salary when unavailable; "
                + "do not invent details. Include each material job requirement as a separate "
                + "requirement match using only MET, PARTIALLY_MET, NOT_MET, or UNKNOWN, "
                + "with a concise explanation specific to that requirement. "
                + "Keep matchSummary a concise overall assessment, not a copy of the individual "
                + "requirement explanations. Return red flags and practical questions to clarify "
                + "as separate list items; questions should address missing information, ambiguity, "
                + "or identified concerns.\n"
                + "Submission type: " + request.submissionType() + "\n"
                + "Job context:\n" + request.jobContext() + "\n"
                + "Candidate target roles: "
                + (context == null ? List.of() : context.targetRoles()) + "\n"
                + "Preferences: "
                + (context == null ? List.of() : context.preferences()) + "\n"
                + "Red flags: "
                + (context == null ? List.of() : context.redFlags());
    }

    // Retrieve a persisted analysis and map it to the API response.
    public JobAnalysisResponse get(UUID id) {
        JobAnalysis analysis = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Analysis not found"));

        return new JobAnalysisResponse(
                analysis.getId(),
                analysis.getJobSubmissionId(),
                analysis.getCompanyContext(),
                analysis.getRoleTitle(),
                analysis.getApplicationDeadline(),
                analysis.getSalaryRange(),
                analysis.getRedFlags(),
                analysis.getRequirements(),
                analysis.getMatchSummary(),
                analysis.getQuestionsToClarify(),
                analysis.getCreatedAt());
    }

    // Publish a status update for Job Service to apply to the submission.
    private void publishStatus(
            UUID jobSubmissionId,
            UUID jobAnalysisId,
            JobStatus status,
            String errorMessage) {
        log.info(
                "Publishing job status: jobSubmissionId={}, jobAnalysisId={}, status={}",
                jobSubmissionId,
                jobAnalysisId,
                status);
        rabbit.convertAndSend(
                exchangeName,
                statusRoutingKey,
                new JobStatusEvent(
                        jobSubmissionId,
                        jobAnalysisId,
                        status,
                        errorMessage));
    }

}
