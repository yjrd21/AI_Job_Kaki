package com.fitness.aiservice.controller;
import com.fitness.aiservice.dto.JobAnalysisResponse; import com.fitness.aiservice.service.AnalysisService; import java.util.UUID;
import lombok.RequiredArgsConstructor; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/job-analyses") @RequiredArgsConstructor
public class JobAnalysisController { private final AnalysisService service;
 @GetMapping("/{analysisId}") public JobAnalysisResponse get(@PathVariable UUID analysisId) { return service.get(analysisId); } }
