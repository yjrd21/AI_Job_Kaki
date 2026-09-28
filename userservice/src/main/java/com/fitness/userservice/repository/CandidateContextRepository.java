package com.fitness.userservice.repository;
import com.fitness.userservice.model.CandidateContext;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface CandidateContextRepository extends MongoRepository<CandidateContext, UUID> {
    List<CandidateContext> findByUserId(UUID userId);
    Optional<CandidateContext> findByIdAndUserId(UUID id, UUID userId);
}
