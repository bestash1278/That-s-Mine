package com.thatsmine.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "lost_report_images", indexes = {
    @Index(name = "idx_lost_report_images_report", columnList = "report_id")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LostReportImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long imageId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private LostReport report;

    @Column(nullable = false)
    private String imageUrl;

    @Column(nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private Boolean isThumbnail;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void changeOrder(int sortOrder, boolean thumbnail) {
        this.sortOrder = sortOrder;
        this.isThumbnail = thumbnail;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sortOrder == null) {
            sortOrder = 0;
        }
        if (isThumbnail == null) {
            isThumbnail = false;
        }
    }
}
