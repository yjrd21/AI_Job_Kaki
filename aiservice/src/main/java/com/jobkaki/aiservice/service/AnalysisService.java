package com.jobkaki.aiservice.service;

import com.jobkaki.aiservice.dto.JobAnalysisRequest;
import com.jobkaki.aiservice.dto.JobAnalysisResponse;
import com.jobkaki.aiservice.dto.JobStatusEvent;
import com.jobkaki.aiservice.model.JobAnalysis;
import com.jobkaki.aiservice.model.JobStatus;
import com.jobkaki.aiservice.model.RequirementMatch;
import com.jobkaki.aiservice.model.RequirementMatchStatus;
import com.jobkaki.aiservice.repository.JobAnalysisRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
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
        publishStatus(
                request.jobSubmissionId(),
                null,
                JobStatus.PROCESSING,
                null);

        try {
            String answer = openAI.getAnswer(buildPrompt(request));
            JobAnalysis analysis = new JobAnalysis();
            analysis.setId(UUID.randomUUID());
            analysis.setJobSubmissionId(request.jobSubmissionId());
            analysis.setRoleTitle(resolveRoleTitle(request));
            analysis.setRedFlagAnalysis(
                    "AI-generated analysis; verify external sources before acting.");
            analysis.setRequirements(List.of(
                    new RequirementMatch(
                            "Candidate fit",
                            RequirementMatchStatus.UNKNOWN,
                            answer)));
            analysis.setMatchSummary(answer);
            analysis.setCreatedAt(LocalDateTime.now());
            repository.save(analysis);

            publishStatus(
                    request.jobSubmissionId(),
                    analysis.getId(),
                    JobStatus.COMPLETED,
                    null);
        } catch (Exception exception) {
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

        return "Analyze this job posting for candidate fit. "
                + "Return company context, role title, deadline, salary range, "
                + "red flags, requirement matches, and a concise match summary.\n"
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
                analysis.getRedFlagAnalysis(),
                analysis.getRequirements(),
                analysis.getMatchSummary(),
                analysis.getCreatedAt());
    }

    // Publish a status update for Job Service to apply to the submission.
    private void publishStatus(
            UUID jobSubmissionId,
            UUID jobAnalysisId,
            JobStatus status,
            String errorMessage) {
        rabbit.convertAndSend(
                exchangeName,
                statusRoutingKey,
                new JobStatusEvent(
                        jobSubmissionId,
                        jobAnalysisId,
                        status,
                        errorMessage));
    }

    // Resolve the candidate's target roles for storage with the analysis.
    private String resolveRoleTitle(JobAnalysisRequest request) {
        if (request.candidateContext() == null) {
            return "Unknown role";
        }

        return String.join(
                ", ",
                Optional.ofNullable(request.candidateContext().targetRoles())
                        .orElse(List.of()));
    }
}
