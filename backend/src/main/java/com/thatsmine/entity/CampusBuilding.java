package com.thatsmine.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "campus_buildings", indexes = {
    @Index(name = "idx_building_coords", columnList = "latitude, longitude")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampusBuilding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long buildingId;

    @Column(nullable = false)
    private String buildingName;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 관리자 수정. 좌표는 설정값이므로 서비스에서 범위를 검증한 뒤 호출한다. */
    public void update(String buildingName, BigDecimal latitude, BigDecimal longitude, String description) {
        this.buildingName = buildingName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.description = description;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
