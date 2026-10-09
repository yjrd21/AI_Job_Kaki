package com.jobkaki.aiservice.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

// Represents the persisted AI analysis produced for a submitted job.
@Data
@Document("job_analyses")
public class JobAnalysis {
    @Id
    private UUID id;

    private UUID jobSubmissionId;
    private String companyContext;
    private String roleTitle;
    private String applicationDeadline;
    private String salaryRange;
    private List<String> redFlags;
    private List<RequirementMatch> requirements;
    private String matchSummary;
    private List<String> questionsToClarify;

    @CreatedDate
    private LocalDateTime createdAt;
}
