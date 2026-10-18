package com.jobkaki.userservice.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Internal snapshot only. Public profile responses deliberately omit CV bytes.
public record CandidateAnalysisContextResponse(
        UUID id, UUID userId, String cvFileName, String cvContentType, byte[] cvFile,
        List<String> targetRoles, List<String> preferences, List<String> redFlags,
        LocalDateTime createdAt, LocalDateTime updatedAt) {
}
