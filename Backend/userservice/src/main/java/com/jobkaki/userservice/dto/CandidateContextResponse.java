package com.jobkaki.userservice.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

// Represents the candidate context data returned by the API without exposing the CV binary.
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
