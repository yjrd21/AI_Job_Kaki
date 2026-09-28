package com.fitness.jobservice.dto;
import com.fitness.jobservice.model.JobStatus;
import java.time.LocalDateTime;
import java.util.UUID;
public record JobSubmissionResponse(UUID id, JobStatus status, LocalDateTime createdAt, UUID jobAnalysisId) {}
