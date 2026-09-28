package com.fitness.jobservice.service;
import com.fitness.jobservice.dto.CandidateContextResponse;
import java.util.UUID;
/** Seam for the User Service; production transport can be supplied without sharing databases. */
public interface CandidateContextClient {
    CandidateContextResponse get(UUID userId, UUID contextId);
}
