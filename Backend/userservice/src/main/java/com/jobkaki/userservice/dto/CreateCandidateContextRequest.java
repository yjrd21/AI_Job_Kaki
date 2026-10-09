package com.jobkaki.userservice.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

// Represents the data required to create a new candidate context for a user.
public record CreateCandidateContextRequest(
        byte[] cvFile,
        String cvFileName,
        @NotEmpty List<String> targetRoles,
        List<String> preferences,
        List<String> redFlags) {
}
