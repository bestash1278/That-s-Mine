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

    // ------------------------------------------------------------------ 변경 (서비스에서 검증 후 호출)

    /**
     * 신고자가 고칠 수 있는 물품·발견 정보. 처리 상태는 관리자가 바꾼다(10단계).
     */
    public void updateByReporter(Category category, String title, String description, String privateFeatures,
                                 LocalDate foundDate, LocalTime foundTime,
                                 CampusBuilding foundBuilding, String foundLocation, String foundLocationDetail,
                                 BigDecimal foundLatitude, BigDecimal foundLongitude) {
        this.category = category;
        this.title = title;
        this.description = description;
        this.privateFeatures = privateFeatures;
        this.foundDate = foundDate;
        this.foundTime = foundTime;
        this.foundBuilding = foundBuilding;
        this.foundLocation = foundLocation;
        this.foundLocationDetail = foundLocationDetail;
        this.foundLatitude = foundLatitude;
        this.foundLongitude = foundLongitude;
    }

    /** 보관 상태와 보관 장소. 전달 완료(HANDED_OVER)가 아니면 보관 장소를 모두 비운다. */
    public void updateCustody(CustodyType custodyType, StorageLocation storage, String storageLocation,
                              String storageLocationDetail, BigDecimal storageLatitude, BigDecimal storageLongitude) {
        this.custodyType = custodyType;
        boolean handedOver = custodyType == CustodyType.HANDED_OVER;
        this.storage = handedOver ? storage : null;
        this.storageLocation = handedOver ? storageLocation : null;
        this.storageLocationDetail = handedOver ? storageLocationDetail : null;
        this.storageLatitude = handedOver ? storageLatitude : null;
        this.storageLongitude = handedOver ? storageLongitude : null;
    }

    /** 처리 상태 변경(관리자·반환 신청 처리). 허용 여부는 서비스에서 먼저 검증한다. */
    public void changeStatus(FoundItemStatus next) {
        this.status = next;
    }

    /** 관리자가 잘못 입력된 발견 위치를 바로잡는다. */
    public void updateFoundLocation(CampusBuilding foundBuilding, String foundLocation, String foundLocationDetail,
                                    BigDecimal foundLatitude, BigDecimal foundLongitude) {
        this.foundBuilding = foundBuilding;
        this.foundLocation = foundLocation;
        this.foundLocationDetail = foundLocationDetail;
        this.foundLatitude = foundLatitude;
        this.foundLongitude = foundLongitude;
    }

    /** Soft Delete: 행은 남기고 삭제 시각만 기록한다. 반환 신청 이력은 그대로 남는다. */
    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

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
