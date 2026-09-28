package com.jobkaki.userservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(UUID id, String email, String firstName, String lastName,
                           LocalDateTime createdAt, LocalDateTime updatedAt) {}
