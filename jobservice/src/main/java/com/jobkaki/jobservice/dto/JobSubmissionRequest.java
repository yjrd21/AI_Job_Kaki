package com.jobkaki.jobservice.dto;
import com.jobkaki.jobservice.model.JobSubmissionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
public record JobSubmissionRequest(@NotNull JobSubmissionType submissionType, @NotBlank String jobContext,
                                   @NotNull UUID candidateContextId) {}
