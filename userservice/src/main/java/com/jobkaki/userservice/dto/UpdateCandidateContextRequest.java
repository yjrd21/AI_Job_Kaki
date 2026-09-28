package com.jobkaki.userservice.dto;

import java.util.List;

public record UpdateCandidateContextRequest(
        byte[] cvFile, String cvFileName, List<String> targetRoles,
        List<String> preferences, List<String> redFlags) {}
