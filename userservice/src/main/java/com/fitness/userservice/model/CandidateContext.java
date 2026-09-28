package com.fitness.userservice.model;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.mapping.Document;
@Data @Document("candidate_contexts")
public class CandidateContext {
    @Id private UUID id; private UUID userId; private byte[] cvFile; private String cvFileName;
    private List<String> targetRoles; private List<String> preferences; private List<String> redFlags;
    @CreatedDate private LocalDateTime createdAt; @LastModifiedDate private LocalDateTime updatedAt;
}
