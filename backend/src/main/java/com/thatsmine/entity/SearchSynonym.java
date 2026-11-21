package com.thatsmine.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "search_synonyms", indexes = {
    @Index(name = "idx_search_synonyms_term", columnList = "term")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchSynonym {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long synonymId;

    @Column(nullable = false)
    private String term;

    @Column(nullable = false)
    private String canonical;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
