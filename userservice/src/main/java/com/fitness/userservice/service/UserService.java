package com.fitness.userservice.service;

import com.fitness.userservice.dto.*;
import com.fitness.userservice.model.*;
import com.fitness.userservice.repository.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository users;
    private final CandidateContextRepository contexts;

    public UserResponse create(CreateUserRequest r) {
        if (users.existsByEmail(r.email())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        User u = new User(); u.setId(UUID.randomUUID()); u.setEmail(r.email()); u.setPassword(r.password());
        u.setFirstName(r.firstName()); u.setLastName(r.lastName()); u.setCreatedAt(LocalDateTime.now()); u.setUpdatedAt(u.getCreatedAt());
        return response(users.save(u));
    }
    public UserResponse get(UUID id) { return response(users.findById(id).orElseThrow(() -> notFound("User"))); }
    public UserResponse update(UUID id, UpdateUserRequest r) {
        User u = users.findById(id).orElseThrow(() -> notFound("User"));
        if (r.email() != null) u.setEmail(r.email()); if (r.password() != null) u.setPassword(r.password());
        if (r.firstName() != null) u.setFirstName(r.firstName()); if (r.lastName() != null) u.setLastName(r.lastName());
        u.setUpdatedAt(LocalDateTime.now()); return response(users.save(u));
    }
    public void delete(UUID id) { users.deleteById(id); }
    public CandidateContextResponse createContext(UUID userId, CreateCandidateContextRequest r) {
        get(userId); CandidateContext c = new CandidateContext(); c.setId(UUID.randomUUID()); c.setUserId(userId);
        apply(c, r.cvFile(), r.cvFileName(), r.targetRoles(), r.preferences(), r.redFlags());
        c.setCreatedAt(LocalDateTime.now()); c.setUpdatedAt(c.getCreatedAt()); return contextResponse(contexts.save(c));
    }
    public List<CandidateContextResponse> contexts(UUID userId) { get(userId); return contexts.findByUserId(userId).stream().map(this::contextResponse).toList(); }
    public CandidateContextResponse context(UUID userId, UUID contextId) {
        return contextResponse(contexts.findByIdAndUserId(contextId, userId).orElseThrow(() -> notFound("Candidate context")));
    }
    public CandidateContextResponse updateContext(UUID userId, UUID id, UpdateCandidateContextRequest r) {
        CandidateContext c = contexts.findByIdAndUserId(id, userId).orElseThrow(() -> notFound("Candidate context"));
        apply(c, r.cvFile(), r.cvFileName(), r.targetRoles(), r.preferences(), r.redFlags()); c.setUpdatedAt(LocalDateTime.now());
        return contextResponse(contexts.save(c));
    }
    public void deleteContext(UUID userId, UUID id) { context(userId, id); contexts.deleteById(id); }
    private void apply(CandidateContext c, byte[] cv, String name, List<String> roles, List<String> prefs, List<String> flags) {
        if (cv != null) c.setCvFile(cv); if (name != null) c.setCvFileName(name); if (roles != null) c.setTargetRoles(roles);
        if (prefs != null) c.setPreferences(prefs); if (flags != null) c.setRedFlags(flags);
    }
    private UserResponse response(User u) { return new UserResponse(u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.getCreatedAt(), u.getUpdatedAt()); }
    private CandidateContextResponse contextResponse(CandidateContext c) { return new CandidateContextResponse(c.getId(), c.getUserId(), c.getCvFileName(), c.getTargetRoles(), c.getPreferences(), c.getRedFlags(), c.getCreatedAt(), c.getUpdatedAt()); }
    private ResponseStatusException notFound(String kind) { return new ResponseStatusException(HttpStatus.NOT_FOUND, kind + " not found"); }
}
