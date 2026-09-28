package com.jobkaki.userservice.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record CandidateContextResponse(UUID id, UUID userId, String cvFileName,
        List<String> targetRoles, List<String> preferences, List<String> redFlags,
        LocalDateTime createdAt, LocalDateTime updatedAt) {}
