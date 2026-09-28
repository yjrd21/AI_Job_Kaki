package com.jobkaki.userservice.dto;

import java.util.List;

// Represents the optional data used to update an existing candidate context.
public record UpdateCandidateContextRequest(
        byte[] cvFile,
        String cvFileName,
        List<String> targetRoles,
        List<String> preferences,
        List<String> redFlags) {
}
