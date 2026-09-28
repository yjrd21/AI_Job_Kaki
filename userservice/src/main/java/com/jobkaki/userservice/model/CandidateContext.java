package com.jobkaki.userservice.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document("candidate_contexts")
public class CandidateContext {
    @Id
    private UUID id;
    private UUID userId;
    private byte[] cvFile;
    private String cvFileName;
    private List<String> targetRoles;
    private List<String> preferences;
    private List<String> redFlags;
    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
