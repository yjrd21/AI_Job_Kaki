package com.jobkaki.userservice.controller;

import com.jobkaki.userservice.dto.*;
import com.jobkaki.userservice.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService service;

    @PostMapping public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
        return service.create(request);
    }
    @GetMapping("/{userId}") public UserResponse get(@PathVariable UUID userId) {
        return service.get(userId);
    }
    @PutMapping("/{userId}") public UserResponse update(@PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request) { return service.update(userId, request); }
    @DeleteMapping("/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID userId) { service.delete(userId); }

    @PostMapping("/{userId}/candidate-contexts")
    public CandidateContextResponse createContext(@PathVariable UUID userId,
            @Valid @RequestBody CreateCandidateContextRequest request) {
        return service.createContext(userId, request);
    }
    @GetMapping("/{userId}/candidate-contexts")
    public List<CandidateContextResponse> contexts(@PathVariable UUID userId) { return service.contexts(userId); }
    @GetMapping("/{userId}/candidate-contexts/{contextId}")
    public CandidateContextResponse context(@PathVariable UUID userId, @PathVariable UUID contextId) {
        return service.context(userId, contextId);
    }
    @PutMapping("/{userId}/candidate-contexts/{contextId}")
    public CandidateContextResponse updateContext(@PathVariable UUID userId, @PathVariable UUID contextId,
            @RequestBody UpdateCandidateContextRequest request) { return service.updateContext(userId, contextId, request); }
    @DeleteMapping("/{userId}/candidate-contexts/{contextId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteContext(@PathVariable UUID userId, @PathVariable UUID contextId) {
        service.deleteContext(userId, contextId);
    }
}
