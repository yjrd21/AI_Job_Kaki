package com.fitness.userservice.dto;

import jakarta.validation.constraints.Email;

public record UpdateUserRequest(
        @Email String email, String password, String firstName, String lastName) {}
