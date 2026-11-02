package com.jobkaki.aiservice.client;

import com.jobkaki.aiservice.dto.JobAnalysisRequest.CandidateContext;
import com.jobkaki.aiservice.dto.JobAnalysisResult;

public interface AiAnalysisClientInterface {
    JobAnalysisResult getAnalysis(String prompt, CandidateContext candidate);
}
