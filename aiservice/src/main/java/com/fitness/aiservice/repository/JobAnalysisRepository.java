package com.fitness.aiservice.repository;
import com.fitness.aiservice.model.JobAnalysis; import java.util.*; import org.springframework.data.mongodb.repository.MongoRepository;
public interface JobAnalysisRepository extends MongoRepository<JobAnalysis, UUID> { Optional<JobAnalysis> findByJobSubmissionId(UUID jobSubmissionId); }
