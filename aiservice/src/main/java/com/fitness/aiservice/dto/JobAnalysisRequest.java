package com.fitness.aiservice.dto;
import java.util.*;
public record JobAnalysisRequest(UUID jobSubmissionId, UUID userId, String submissionType, String jobContext, CandidateContext candidateContext) {
 public record CandidateContext(UUID id, UUID userId, String cvFileName, List<String> targetRoles, List<String> preferences, List<String> redFlags) {}
}
