package com.jobkaki.aiservice.service;

// Carries a stable code and a safe message suitable for the submission API.
public class AnalysisException extends RuntimeException {
    private final String code;

    public AnalysisException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
