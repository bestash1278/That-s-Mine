package com.thatsmine.dto;

import com.thatsmine.entity.StorageLocation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageInfoDTO {
    private Long storageId;
    private String storageName;
    private String buildingName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String detailLocation;
    private String contactPhone;
    private String operatingHours;
    private String pickupGuide;

    public static StorageInfoDTO from(StorageLocation storage) {
        return StorageInfoDTO.builder()
                .storageId(storage.getStorageId())
                .storageName(storage.getStorageName())
                .buildingName(storage.getBuilding().getBuildingName())
                .latitude(storage.getLatitude())
                .longitude(storage.getLongitude())
                .detailLocation(storage.getDetailLocation())
                .contactPhone(storage.getContactPhone())
                .operatingHours(storage.getOperatingHours())
                .pickupGuide(storage.getPickupGuide())
                .build();
    }
}
