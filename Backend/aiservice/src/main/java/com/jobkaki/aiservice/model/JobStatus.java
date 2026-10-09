package com.jobkaki.aiservice.model;

// Represents the lifecycle status of a submitted job analysis as it moves through both services.
public enum JobStatus {
    // Set by Job Service when the submission is persisted and published for asynchronous analysis.
    PENDING,

    // Set by AI Service when it begins processing the analysis request.
    PROCESSING,

    // Set by AI Service after the analysis is persisted successfully.
    COMPLETED,

    // Set by AI Service when analysis fails; the status event carries the error message.
    FAILED
}
