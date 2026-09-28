package com.jobkaki.userservice.repository;

import com.jobkaki.userservice.model.CandidateContext;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateContextRepository extends JpaRepository<CandidateContext, UUID> {
    List<CandidateContext> findByUserId(UUID userId);

    Optional<CandidateContext> findByIdAndUserId(
            UUID id,
            UUID userId);
}
