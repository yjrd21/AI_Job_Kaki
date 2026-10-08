package com.jobkaki.userservice.service;

import com.jobkaki.userservice.dto.*;
import com.jobkaki.userservice.model.*;
import com.jobkaki.userservice.repository.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {
    private static final int MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024;

    private final UserRepository userRepository;
    private final CandidateContextRepository contextRepository;

    // Create or synchronize a user account using its email and Keycloak ID.
    public UserResponse create(CreateUserRequest request) {
        log.info("Synchronizing user account");

        User userByEmail = userRepository.findByEmail(request.email()).orElse(null);
        User userByKeycloakId = userRepository.findByKeycloakId(request.keycloakId()).orElse(null);

        if (userByEmail != null
                && userByKeycloakId != null
                && !userByEmail.getId().equals(userByKeycloakId.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email and Keycloak ID are already associated with different users");
        }

        LocalDateTime now = LocalDateTime.now();
        User user = userByKeycloakId != null ? userByKeycloakId : userByEmail;
        if (user == null) {
            user = new User();
            user.setId(UUID.randomUUID());
            user.setPassword(request.password());
            user.setCreatedAt(now);
        }

        user.setKeycloakId(request.keycloakId());
        user.setEmail(request.email());
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setUpdatedAt(now);

        User saved = userRepository.save(user);
        log.info("Synchronized user account with userId={}", saved.getId());
        return response(saved);
    }

    // Fetch a user by ID
    // @param id the ID of the user to fetch
    // @return the user response
    public UserResponse get(UUID id) {
        // Fetch the user from the database
        log.debug("Fetching user account with userId={}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> notFound("User", id));

        // return the user response
        log.debug("Fetched user account with userId={}", id);
        return response(user);
    }

    // Update a user by ID
    // @param id the ID of the user to update
    // @param r the request containing the updated user information
    // @return the updated user response
    public UserResponse update(UUID id, UpdateUserRequest r) {

        // Find the user by ID
        log.info("Updating user account with userId={}", id);
        User u = userRepository.findById(id)
                .orElseThrow(() -> notFound("User", id));

        // validate and update the user fields if they are not null
        if (r.email() != null)
            u.setEmail(r.email());
        if (r.password() != null)
            u.setPassword(r.password());
        if (r.firstName() != null)
            u.setFirstName(r.firstName());
        if (r.lastName() != null)
            u.setLastName(r.lastName());
        u.setUpdatedAt(LocalDateTime.now());

        // save the updated user to the database
        User saved = userRepository.save(u);
        log.info("Updated user account with userId={}", saved.getId());

        // return the updated user response
        return response(saved);
    }

    // Delete a user account from the user database
    // @param id the ID of the user to delete
    public void delete(UUID id) {
        // Find the user before deleting the account
        log.info("Deleting user account with userId={}", id);
        get(id);

        // Delete the user from the database
        userRepository.deleteById(id);
        log.info("Deleted user account with userId={}", id);
    }

    // Create and persist a candidate context for a user
    // @param userId the ID of the user who owns the candidate context
    // @param r the request containing the candidate context information
    // @return the candidate context response
    public CandidateContextResponse createContext(
            UUID userId,
            CreateCandidateContextRequest r) {
        // Validate that the user exists
        log.info("Creating candidate context for userId={}", userId);
        get(userId);

        // Create a new candidate context
        CandidateContext c = new CandidateContext();
        c.setId(UUID.randomUUID());
        c.setUserId(userId);
        validateCvFileSize(r.cvFile());
        apply(
                c,
                r.cvFile(),
                r.cvFileName(),
                r.targetRoles(),
                r.preferences(),
                r.redFlags());
        c.setCreatedAt(LocalDateTime.now());
        c.setUpdatedAt(c.getCreatedAt());

        // Save the candidate context to the database
        CandidateContext saved = contextRepository.save(c);
        log.info(
                "Created candidate context with contextId={} for userId={}",
                saved.getId(),
                userId);

        // Return the candidate context response
        return contextResponse(saved);
    }

    // Fetch all candidate contexts belonging to a user
    // @param userId the ID of the user whose contexts should be fetched
    // @return a list of candidate context responses
    public List<CandidateContextResponse> contexts(UUID userId) {
        // Validate that the user exists
        log.debug("Fetching candidate contexts for userId={}", userId);
        get(userId);

        // Fetch and map the candidate contexts from the database
        List<CandidateContextResponse> responses = contextRepository.findByUserId(userId).stream()
                .map(this::contextResponse)
                .toList();
        log.debug(
                "Fetched {} candidate contexts for userId={}",
                responses.size(),
                userId);

        // Return the candidate context responses
        return responses;
    }

    // Fetch a specific candidate context belonging to a user
    // @param userId the ID of the user who owns the candidate context
    // @param contextId the ID of the candidate context to fetch
    // @return the candidate context response
    public CandidateContextResponse context(UUID userId, UUID contextId) {
        // Fetch the candidate context from the database
        log.debug(
                "Fetching candidate context with contextId={} for userId={}",
                contextId,
                userId);
        CandidateContext context = contextRepository.findByIdAndUserId(contextId, userId)
                .orElseThrow(() -> notFound("Candidate context", contextId));
        log.debug(
                "Fetched candidate context with contextId={} for userId={}",
                contextId,
                userId);

        // Return the candidate context response
        return contextResponse(context);
    }

    // Update an existing candidate context
    // @param userId the ID of the user who owns the candidate context
    // @param id the ID of the candidate context to update
    // @param r the request containing the updated candidate context information
    // @return the updated candidate context response
    public CandidateContextResponse updateContext(
            UUID userId,
            UUID id,
            UpdateCandidateContextRequest r) {
        // Find the candidate context by ID and user ID
        log.info(
                "Updating candidate context with contextId={} for userId={}",
                id,
                userId);
        CandidateContext c = contextRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> notFound("Candidate context", id));

        // Update only the fields provided in the request
        validateCvFileSize(r.cvFile());
        apply(
                c,
                r.cvFile(),
                r.cvFileName(),
                r.targetRoles(),
                r.preferences(),
                r.redFlags());
        c.setUpdatedAt(LocalDateTime.now());

        // Save the updated candidate context to the database
        CandidateContext saved = contextRepository.save(c);
        log.info(
                "Updated candidate context with contextId={} for userId={}",
                id,
                userId);

        // Return the updated candidate context response
        return contextResponse(saved);
    }

    // Delete a candidate context from the user database
    // @param userId the ID of the user who owns the candidate context
    // @param id the ID of the candidate context to delete
    public void deleteContext(UUID userId, UUID id) {
        // Find the candidate context before deleting it
        log.info(
                "Deleting candidate context with contextId={} for userId={}",
                id,
                userId);
        context(userId, id);

        // Delete the candidate context from the database
        contextRepository.deleteById(id);
        log.info(
                "Deleted candidate context with contextId={} for userId={}",
                id,
                userId);
    }

    // Apply the non-null candidate context fields from a request to an entity
    // @param c the candidate context entity to update
    // @param cv the CV file contents
    // @param name the CV file name
    // @param roles the target roles
    // @param prefs the candidate preferences
    // @param flags the candidate red flags
    private void apply(
            CandidateContext c,
            byte[] cv,
            String name,
            List<String> roles,
            List<String> prefs,
            List<String> flags) {
        // Update only fields included in the request
        if (cv != null)
            c.setCvFile(cv);
        if (name != null)
            c.setCvFileName(name);
        if (roles != null)
            c.setTargetRoles(roles);
        if (prefs != null)
            c.setPreferences(prefs);
        if (flags != null)
            c.setRedFlags(flags);
    }

    // Reject CV uploads that exceed the service limit before persistence.
    private void validateCvFileSize(byte[] cv) {
        if (cv != null && cv.length > MAX_CV_FILE_SIZE_BYTES) {
            log.warn(
                    "Rejected CV upload because it exceeds the {} byte limit",
                    MAX_CV_FILE_SIZE_BYTES);
            throw new ResponseStatusException(
                    HttpStatus.CONTENT_TOO_LARGE,
                    "CV file must not exceed 5 MB");
        }
    }

    // Map a user entity to a response without exposing the password
    // @param u the user entity to map
    // @return the user response
    private UserResponse response(User user) {
        return new UserResponse(
                user.getId(),
                user.getKeycloakId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }

    // Map a candidate context entity to a response without exposing the CV binary
    // @param c the candidate context entity to map
    // @return the candidate context response
    private CandidateContextResponse contextResponse(CandidateContext c) {
        return new CandidateContextResponse(
                c.getId(),
                c.getUserId(),
                c.getCvFileName(),
                c.getTargetRoles(),
                c.getPreferences(),
                c.getRedFlags(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }

    // Create a not-found exception for a missing user or candidate context
    // @param kind the type of resource that was not found
    // @param id the ID of the missing resource
    // @return the not-found exception
    private ResponseStatusException notFound(String kind, UUID id) {
        log.warn("{} not found with id={}", kind, id);
        return new ResponseStatusException(HttpStatus.NOT_FOUND, kind + " not found");
    }

    public Boolean existByKeyCloakId(String keycloackId) {
        log.info("Calling User Validation API for keycloakId: {}", keycloackId);
        return userRepository.existsByKeycloakId(keycloackId);
    }
}
