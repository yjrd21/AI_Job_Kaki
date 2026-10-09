package com.jobkaki.jobservice.repository;

import com.jobkaki.jobservice.model.JobSubmission;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

// Provides persistence operations for submitted jobs.
public interface JobSubmissionRepository extends MongoRepository<JobSubmission, UUID> {

        // Return all submitted jobs belonging to a user.
        List<JobSubmission> findByUserId(UUID userId);

        // Return one submitted job only when it belongs to the specified user.
        Optional<JobSubmission> findByIdAndUserId(
                        UUID id,
                        UUID userId);
}
