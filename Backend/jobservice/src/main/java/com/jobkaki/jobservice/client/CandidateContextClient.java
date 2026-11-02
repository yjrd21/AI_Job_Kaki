package com.jobkaki.jobservice.client;
import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;

// Defines the client contract used by Job Service to retrieve candidate context data.
public interface CandidateContextClient {

    // Retrieve one candidate context for a user.
    CandidateContextResponse get(UUID userId, UUID contextId);
}
