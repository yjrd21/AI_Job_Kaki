package com.jobkaki.aiservice.dto;
import com.jobkaki.aiservice.model.*; import java.time.LocalDateTime; import java.util.*;
public record JobAnalysisResponse(UUID id, UUID jobSubmissionId, String companyContext, String roleTitle, String applicationDeadline,
 String salaryRange, String redFlagAnalysis, List<RequirementMatch> requirements, String matchSummary, LocalDateTime createdAt) {}
