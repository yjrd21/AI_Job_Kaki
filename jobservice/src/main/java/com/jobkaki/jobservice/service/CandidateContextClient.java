package com.jobkaki.jobservice.service;
import com.jobkaki.jobservice.dto.CandidateContextResponse;
import java.util.UUID;
/** Seam for the User Service; production transport can be supplied without sharing databases. */
public interface CandidateContextClient {
    CandidateContextResponse get(UUID userId, UUID contextId);
}
