package com.jobkaki.aiservice.model;

import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

// A failure receipt, not an evaluation. Redelivery must not reevaluate an already failed submission.
@Document("job_analysis_failures")
public record AnalysisFailure(@Id UUID id, String errorCode, String errorMessage) {
}
