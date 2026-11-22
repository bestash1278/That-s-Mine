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
    @Index(name = "idx_lost_reports_deleted_at", columnList = "deleted_at"),
    @Index(name = "idx_lost_reports_lost_date", columnList = "lost_date"),
    @Index(name = "idx_lost_reports_coords", columnList = "lost_latitude, lost_longitude")
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

    /** 대표 추정 위치로 고른 교내 건물(선택). 지도 좌표가 없으면 이 건물 좌표로 표시한다. (V3) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lost_building_id")
    private CampusBuilding lostBuilding;

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

    // ------------------------------------------------------------------ 변경 (서비스에서 검증 후 호출)

    public void updateContent(Category category, String title, String description,
                              LocalDate lostDate, LocalDate lostEndDate,
                              CampusBuilding lostBuilding, String lostLocation, String lostLocationDetail,
                              BigDecimal lostLatitude, BigDecimal lostLongitude) {
        this.category = category;
        this.title = title;
        this.description = description;
        this.lostDate = lostDate;
        this.lostEndDate = lostEndDate;
        this.lostBuilding = lostBuilding;
        this.lostLocation = lostLocation;
        this.lostLocationDetail = lostLocationDetail;
        this.lostLatitude = lostLatitude;
        this.lostLongitude = lostLongitude;
    }

    public void changeStatus(LostReportStatus status) {
        this.status = status;
    }

    /** Soft Delete: 행은 남기고 삭제 시각만 기록한다. 조회·지도·추천에서 제외된다. */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

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
