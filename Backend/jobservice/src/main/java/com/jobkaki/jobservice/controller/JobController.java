package com.jobkaki.jobservice.controller;

import com.jobkaki.jobservice.dto.JobSubmissionRequest;
import com.jobkaki.jobservice.dto.JobSubmissionResponse;
import com.jobkaki.jobservice.service.JobService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/{userId}/jobs")
@RequiredArgsConstructor
public class JobController {
    private final JobService service;

    // Submit a job for analysis using the candidate context associated with the user.
    @PostMapping
    public JobSubmissionResponse submit(
            @PathVariable UUID userId,
            @Valid @RequestBody JobSubmissionRequest request) {
        return service.submit(userId, request);
    }

    // Return all job submissions belonging to the user.
    @GetMapping
    public List<JobSubmissionResponse> list(@PathVariable UUID userId) {
        return service.list(userId);
    }

    // Return one job submission belonging to the user.
    @GetMapping("/{jobId}")
    public JobSubmissionResponse get(
            @PathVariable UUID userId,
            @PathVariable UUID jobId) {
        return service.get(userId, jobId);
    }

    // Delete one job submission belonging to the user.
    @DeleteMapping("/{jobId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID userId,
            @PathVariable UUID jobId) {
        service.delete(userId, jobId);
    }
}
