package com.fitness.jobservice.repository;
import com.fitness.jobservice.model.JobSubmission;
import java.util.*;
import org.springframework.data.mongodb.repository.MongoRepository;
public interface JobSubmissionRepository extends MongoRepository<JobSubmission, UUID> {
    List<JobSubmission> findByUserId(UUID userId);
    Optional<JobSubmission> findByIdAndUserId(UUID id, UUID userId);
}
