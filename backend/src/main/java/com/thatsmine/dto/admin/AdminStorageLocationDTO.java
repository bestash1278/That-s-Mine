package com.thatsmine.dto.admin;

import com.thatsmine.entity.StorageLocation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 관리자 화면용 보관 장소(사용 중지 여부 포함) */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStorageLocationDTO {
    private Long storageId;
    private Long buildingId;
    private String buildingName;
    private String storageName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String detailLocation;
    private String description;
    private String contactPhone;
    private String operatingHours;
    private String pickupGuide;
    private boolean active;

    public static AdminStorageLocationDTO from(StorageLocation s) {
        return AdminStorageLocationDTO.builder()
                .storageId(s.getStorageId())
                .buildingId(s.getBuilding().getBuildingId())
                .buildingName(s.getBuilding().getBuildingName())
                .storageName(s.getStorageName())
                .latitude(s.getLatitude())
                .longitude(s.getLongitude())
                .detailLocation(s.getDetailLocation())
                .description(s.getDescription())
                .contactPhone(s.getContactPhone())
                .operatingHours(s.getOperatingHours())
                .pickupGuide(s.getPickupGuide())
                .active(Boolean.TRUE.equals(s.getActive()))
                .build();
    }
}
