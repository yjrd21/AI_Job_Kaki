package com.jobkaki.userservice.model;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@Entity
@Table(name = "candidate_contexts")
public class CandidateContext {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;
    @Column(nullable = false)
    private UUID userId;
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(columnDefinition = "bytea")
    private byte[] cvFile;
    private String cvFileName;

    @ElementCollection
    @CollectionTable(
            name = "candidate_context_target_roles",
            joinColumns = @JoinColumn(name = "candidate_context_id"))
    @Column(name = "target_role")
    private List<String> targetRoles;

    @ElementCollection
    @CollectionTable(
            name = "candidate_context_preferences",
            joinColumns = @JoinColumn(name = "candidate_context_id"))
    @Column(name = "preference")
    private List<String> preferences;

    @ElementCollection
    @CollectionTable(
            name = "candidate_context_red_flags",
            joinColumns = @JoinColumn(name = "candidate_context_id"))
    @Column(name = "red_flag")
    private List<String> redFlags;

    @CreationTimestamp
    private LocalDateTime createdAt;
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
