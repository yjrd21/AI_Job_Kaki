package com.jobkaki.userservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

// Represents the user data returned by the API without exposing the password.
public record UserResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
}
