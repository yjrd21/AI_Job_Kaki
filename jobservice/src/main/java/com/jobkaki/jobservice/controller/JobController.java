package com.jobkaki.jobservice.controller;
import com.jobkaki.jobservice.dto.*;
import com.jobkaki.jobservice.service.JobService;
import jakarta.validation.Valid;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/users/{userId}/jobs") @RequiredArgsConstructor
public class JobController {
    private final JobService service;
    @PostMapping public JobSubmissionResponse submit(@PathVariable UUID userId, @Valid @RequestBody JobSubmissionRequest request) { return service.submit(userId, request); }
    @GetMapping public List<JobSubmissionResponse> list(@PathVariable UUID userId) { return service.list(userId); }
    @GetMapping("/{jobId}") public JobSubmissionResponse get(@PathVariable UUID userId, @PathVariable UUID jobId) { return service.get(userId, jobId); }
    @DeleteMapping("/{jobId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID userId, @PathVariable UUID jobId) { service.delete(userId, jobId); }
}
