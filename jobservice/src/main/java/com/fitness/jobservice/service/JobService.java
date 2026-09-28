package com.fitness.jobservice.service;
import com.fitness.jobservice.dto.*;
import com.fitness.jobservice.model.*;
import com.fitness.jobservice.repository.JobSubmissionRepository;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
@Service @RequiredArgsConstructor
public class JobService {
    private final JobSubmissionRepository repository;
    private final CandidateContextClient contextClient;
    private final RabbitTemplate rabbit;
    public JobSubmissionResponse submit(UUID userId, JobSubmissionRequest r) {
        CandidateContextResponse context = contextClient.get(userId, r.candidateContextId());
        if (context == null) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Candidate context unavailable");
        JobSubmission job = new JobSubmission(); job.setId(UUID.randomUUID()); job.setUserId(userId);
        job.setCandidateContextId(r.candidateContextId()); job.setSubmissionType(r.submissionType()); job.setJobContext(r.jobContext());
        job.setStatus(JobStatus.PENDING); job.setCreatedAt(LocalDateTime.now()); job.setUpdatedAt(job.getCreatedAt()); repository.save(job);
        rabbit.convertAndSend("job-exchange", "job.analyze", new JobAnalysisRequest(job.getId(), userId, job.getSubmissionType(), job.getJobContext(), context));
        return response(job);
    }
    public List<JobSubmissionResponse> list(UUID userId) { return repository.findByUserId(userId).stream().map(this::response).toList(); }
    public JobSubmissionResponse get(UUID userId, UUID id) { return response(repository.findByIdAndUserId(id,userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"))); }
    public void delete(UUID userId, UUID id) { get(userId,id); repository.deleteById(id); }
    public void updateStatus(JobStatusEvent event) { repository.findById(event.jobSubmissionId()).ifPresent(j -> { j.setStatus(event.status()); j.setJobAnalysisId(event.jobAnalysisId()); j.setUpdatedAt(LocalDateTime.now()); repository.save(j); }); }
    private JobSubmissionResponse response(JobSubmission j) { return new JobSubmissionResponse(j.getId(), j.getStatus(), j.getCreatedAt(), j.getJobAnalysisId()); }
}
