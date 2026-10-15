package com.jobkaki.userservice.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jobkaki.userservice.dto.CreateUserRequest;
import com.jobkaki.userservice.dto.UserResponse;
import com.jobkaki.userservice.model.User;
import com.jobkaki.userservice.repository.CandidateContextRepository;
import com.jobkaki.userservice.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateContextRepository contextRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void createInsertsUserWhenEmailAndKeycloakIdAreNew() {
        String subject = UUID.randomUUID().toString();
        CreateUserRequest request = request(subject, "new@example.com");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());
        when(userRepository.findByKeycloakId(request.keycloakId())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.create(request);

        assertEquals(UUID.fromString(subject), response.id());
        assertEquals(request.keycloakId(), response.keycloakId());
        assertEquals(request.email(), response.email());
        assertEquals(request.firstName(), response.firstName());
        assertEquals(request.lastName(), response.lastName());
        assertFalse(response.onboardingCompleted());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createRejectsNonUuidKeycloakIdForNewUser() {
        CreateUserRequest request = request("not-a-uuid", "new@example.com");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());
        when(userRepository.findByKeycloakId(request.keycloakId())).thenReturn(Optional.empty());

        assertThrows(ResponseStatusException.class, () -> userService.create(request));
    }

    @Test
    void createRelinksExistingEmailAndRefreshesProfileWithoutReplacingPassword() {
        User existing = user("old-subject", "existing@example.com", "existing-password");
        CreateUserRequest request = request("new-subject", "existing@example.com");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(existing));
        when(userRepository.findByKeycloakId(request.keycloakId())).thenReturn(Optional.empty());
        when(userRepository.save(existing)).thenReturn(existing);

        UserResponse response = userService.create(request);

        assertEquals(existing.getId(), response.id());
        assertEquals(request.keycloakId(), response.keycloakId());
        assertEquals(request.firstName(), response.firstName());
        assertEquals(request.lastName(), response.lastName());
        assertEquals("existing-password", existing.getPassword());
    }

    @Test
    void createRefreshesEmailAndProfileForExistingKeycloakId() {
        User existing = user("existing-subject", "old@example.com", "existing-password");
        CreateUserRequest request = request("existing-subject", "new@example.com");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());
        when(userRepository.findByKeycloakId(request.keycloakId())).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        UserResponse response = userService.create(request);

        assertEquals(request.email(), response.email());
        assertEquals(request.firstName(), response.firstName());
        assertEquals(request.lastName(), response.lastName());
        assertEquals("existing-password", existing.getPassword());
    }

    @Test
    void createRejectsEmailAndKeycloakIdOwnedByDifferentUsers() {
        CreateUserRequest request = request("subject-a", "email-a@example.com");
        User emailOwner = user("subject-b", request.email(), "password");
        User subjectOwner = user(request.keycloakId(), "email-b@example.com", "password");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(emailOwner));
        when(userRepository.findByKeycloakId(request.keycloakId())).thenReturn(Optional.of(subjectOwner));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userService.create(request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void onboardingCannotCompleteWithoutSavedProfile() {
        User user = user(UUID.randomUUID().toString(), "new@example.com", "password");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(contextRepository.existsByUserId(user.getId())).thenReturn(false);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> userService.completeOnboarding(user.getId()));

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertFalse(user.isOnboardingCompleted());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void onboardingCompletesAfterProfileExists() {
        User user = user(UUID.randomUUID().toString(), "new@example.com", "password");
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(contextRepository.existsByUserId(user.getId())).thenReturn(true);
        when(userRepository.save(user)).thenReturn(user);

        UserResponse response = userService.completeOnboarding(user.getId());

        assertTrue(response.onboardingCompleted());
        assertTrue(user.isOnboardingCompleted());
        verify(userRepository).save(user);
    }

    @Test
    void onboardingCompletionIsIdempotentEvenAfterDeletingAllProfiles() {
        User user = user(UUID.randomUUID().toString(), "new@example.com", "password");
        user.setOnboardingCompleted(true);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserResponse response = userService.completeOnboarding(user.getId());

        assertTrue(response.onboardingCompleted());
        verify(contextRepository, never()).existsByUserId(any(UUID.class));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void accountResynchronizationPreservesCompletionStatus() {
        User user = user(UUID.randomUUID().toString(), "new@example.com", "password");
        user.setOnboardingCompleted(true);
        CreateUserRequest request = request(user.getKeycloakId(), "new@example.com");
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(userRepository.findByKeycloakId(request.keycloakId())).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UserResponse response = userService.create(request);

        assertTrue(response.onboardingCompleted());
    }

    private static CreateUserRequest request(String keycloakId, String email) {
        return new CreateUserRequest(email, "dummy-password", keycloakId, "First", "Last");
    }

    private static User user(String keycloakId, String email, String password) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setKeycloakId(keycloakId);
        user.setEmail(email);
        user.setPassword(password);
        user.setFirstName("Old");
        user.setLastName("Name");
        return user;
    }
}
