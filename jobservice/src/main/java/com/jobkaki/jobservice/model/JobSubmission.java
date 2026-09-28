package com.jobkaki.jobservice.model;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

// Represents a user's submitted job and its analysis lifecycle.
@Data
@Document("job_submissions")
public class JobSubmission {
    @Id
    private UUID id;

    private UUID userId;
    private UUID candidateContextId;
    private JobSubmissionType submissionType;
    private String jobContext;
    private JobStatus status;
    private UUID jobAnalysisId;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
