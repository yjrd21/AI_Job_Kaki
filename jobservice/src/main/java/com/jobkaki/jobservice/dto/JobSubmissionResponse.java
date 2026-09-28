package com.jobkaki.jobservice.dto;
import com.jobkaki.jobservice.model.JobStatus;
import java.time.LocalDateTime;
import java.util.UUID;
public record JobSubmissionResponse(UUID id, JobStatus status, LocalDateTime createdAt, UUID jobAnalysisId) {}
