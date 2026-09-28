package com.jobkaki.aiservice.model;
import java.time.LocalDateTime; import java.util.*; import lombok.Data;
import org.springframework.data.annotation.*; import org.springframework.data.mongodb.core.mapping.Document;
@Data @Document("job_analyses")
public class JobAnalysis {
 @Id private UUID id; private UUID jobSubmissionId; private String companyContext; private String roleTitle;
 private String applicationDeadline; private String salaryRange; private String redFlagAnalysis;
 private List<RequirementMatch> requirements; private String matchSummary; @CreatedDate private LocalDateTime createdAt;
}
