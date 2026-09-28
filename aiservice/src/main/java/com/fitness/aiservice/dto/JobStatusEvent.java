package com.fitness.aiservice.dto;
import com.fitness.aiservice.model.JobStatus; import java.util.UUID;
public record JobStatusEvent(UUID jobSubmissionId, UUID jobAnalysisId, JobStatus status, String errorMessage) {}
