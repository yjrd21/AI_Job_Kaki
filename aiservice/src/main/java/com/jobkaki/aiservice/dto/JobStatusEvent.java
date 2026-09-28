package com.jobkaki.aiservice.dto;
import com.jobkaki.aiservice.model.JobStatus; import java.util.UUID;
public record JobStatusEvent(UUID jobSubmissionId, UUID jobAnalysisId, JobStatus status, String errorMessage) {}
