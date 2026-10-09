package com.jobkaki.aiservice.repository;

import com.jobkaki.aiservice.model.JobAnalysis;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

// Provides persistence operations for completed job analyses.
public interface JobAnalysisRepository
        extends MongoRepository<JobAnalysis, UUID> {

    // Return the analysis associated with a job submission.
    Optional<JobAnalysis> findByJobSubmissionId(UUID jobSubmissionId);
}
