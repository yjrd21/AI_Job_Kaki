package com.jobkaki.userservice.controller;

import com.jobkaki.userservice.dto.CandidateAnalysisContextResponse;
import com.jobkaki.userservice.service.UserService;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Service-to-service access on the trusted network. /internal is not routed by the public gateway.
@RestController
@RequestMapping("/internal/users/{userId}/candidate-contexts")
public class InternalUserController {
    private final UserService service;

    public InternalUserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{contextId}/analysis-context")
    public ResponseEntity<CandidateAnalysisContextResponse> analysisContext(
            @PathVariable UUID userId, @PathVariable UUID contextId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.analysisContext(userId, contextId));
    }
}
