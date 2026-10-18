package com.jobkaki.aiservice.controller;

import com.jobkaki.aiservice.dto.JobAnalysisResponse;
import com.jobkaki.aiservice.service.AnalysisService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/job-analyses")
public class JobAnalysisController {
    private final AnalysisService service;

    public JobAnalysisController(AnalysisService service) {
        this.service = service;
    }

    // Return a persisted job analysis by its identifier.
    @GetMapping("/{analysisId}")
    public JobAnalysisResponse get(@PathVariable UUID analysisId) {
        return service.get(analysisId);
    }
}
