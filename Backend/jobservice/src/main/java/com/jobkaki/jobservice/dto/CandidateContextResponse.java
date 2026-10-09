package com.jobkaki.jobservice.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Represents the candidate context received from the User Service without CV binary data.
public record CandidateContextResponse(
        UUID id,
        UUID userId,
        String cvFileName,
        List<String> targetRoles,
        List<String> preferences,
        List<String> redFlags,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
