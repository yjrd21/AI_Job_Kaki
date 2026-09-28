package com.jobkaki.aiservice.repository;
import com.jobkaki.aiservice.model.JobAnalysis; import java.util.*; import org.springframework.data.mongodb.repository.MongoRepository;
public interface JobAnalysisRepository extends MongoRepository<JobAnalysis, UUID> { Optional<JobAnalysis> findByJobSubmissionId(UUID jobSubmissionId); }
