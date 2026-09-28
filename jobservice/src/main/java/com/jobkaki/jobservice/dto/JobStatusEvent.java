package com.jobkaki.jobservice.dto;
import com.jobkaki.jobservice.model.JobStatus;
import java.util.UUID;
public record JobStatusEvent(UUID jobSubmissionId, UUID jobAnalysisId, JobStatus status, String errorMessage) {}
