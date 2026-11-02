package com.jobkaki.jobservice.client;
import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;

// Defines the candidate context capability used by Job Service.
public interface CandidateContextClientInterface {

    // Retrieve one candidate context for a user.
    CandidateContextResponse get(UUID userId, UUID contextId);
}
