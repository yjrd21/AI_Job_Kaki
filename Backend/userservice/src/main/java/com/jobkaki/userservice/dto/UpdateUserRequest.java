package com.jobkaki.userservice.dto;

import jakarta.validation.constraints.Email;

// Represents the optional data used to update an existing user account.
public record UpdateUserRequest(
                @Email String email,
                String password,
                String firstName,
                String lastName) {
}
