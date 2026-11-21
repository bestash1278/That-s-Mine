package com.thatsmine.entity;

import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "found_items", indexes = {
    @Index(name = "idx_found_items_category", columnList = "category_id"),
    @Index(name = "idx_found_items_status", columnList = "status"),
    @Index(name = "idx_found_items_found_date", columnList = "found_date"),
    @Index(name = "idx_found_items_found_coords", columnList = "found_latitude, found_longitude"),
    @Index(name = "idx_found_items_storage_coords", columnList = "storage_latitude, storage_longitude"),
    @Index(name = "idx_found_items_reporter", columnList = "reporter_id"),
    @Index(name = "idx_found_items_deleted_at", columnList = "deleted_at")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoundItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "found_building_id")
    private CampusBuilding foundBuilding;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "storage_id")
    private StorageLocation storage;

    @Column(nullable = false)
    private String title;

    private String description;

    private String privateFeatures;

    @Column(nullable = false)
    private LocalDate foundDate;

    private LocalTime foundTime;

    @Column(nullable = false)
    private String foundLocation;

    @Column(precision = 10, scale = 7)
    private BigDecimal foundLatitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal foundLongitude;

    private String foundLocationDetail;

    private String storageLocation;

    @Column(precision = 10, scale = 7)
    private BigDecimal storageLatitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal storageLongitude;

    private String storageLocationDetail;

    @Enumerated(EnumType.STRING)
    private CustodyType custodyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FoundItemStatus status;

    @Version
    private Long version;

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
            status = FoundItemStatus.REPORTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
