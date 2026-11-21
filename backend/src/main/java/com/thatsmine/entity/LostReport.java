package com.thatsmine.entity;

import com.thatsmine.enums.LostReportStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "lost_reports", indexes = {
    @Index(name = "idx_lost_reports_category", columnList = "category_id"),
    @Index(name = "idx_lost_reports_status", columnList = "status"),
    @Index(name = "idx_lost_reports_user", columnList = "user_id"),
    @Index(name = "idx_lost_reports_deleted_at", columnList = "deleted_at")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LostReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reportId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    private LocalDate lostDate;

    private LocalDate lostEndDate;

    @Column(nullable = false)
    private String lostLocation;

    @Column(precision = 10, scale = 7)
    private BigDecimal lostLatitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal lostLongitude;

    private String lostLocationDetail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LostReportStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = LostReportStatus.SEARCHING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
