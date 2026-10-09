package com.jobkaki.jobservice.service;
import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;

// Defines the service boundary used by Job Service to retrieve candidate context data.
public interface CandidateContextProvider {

    // Retrieve one candidate context for a user.
    CandidateContextResponse get(UUID userId, UUID contextId);
}
