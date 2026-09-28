package com.fitness.userservice.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateCandidateContextRequest(
        byte[] cvFile, String cvFileName, @NotEmpty List<String> targetRoles,
        List<String> preferences, List<String> redFlags) {}
