package com.fitness.jobservice.dto;
import com.fitness.jobservice.model.JobStatus;
import java.util.UUID;
public record JobStatusEvent(UUID jobSubmissionId, UUID jobAnalysisId, JobStatus status, String errorMessage) {}
