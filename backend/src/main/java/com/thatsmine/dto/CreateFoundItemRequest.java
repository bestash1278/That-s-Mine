package com.thatsmine.dto;

import com.thatsmine.enums.CustodyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateFoundItemRequest {
    private String title;
    private String description;
    private String privateFeatures;
    private Long categoryId;
    private LocalDate foundDate;
    private LocalTime foundTime;
    private String foundLocation;
    private String foundLocationDetail;
    private BigDecimal foundLatitude;
    private BigDecimal foundLongitude;
    private Long foundBuildingId;

    private CustodyType custodyType;
    private String storageLocation;
    private String storageLocationDetail;
    private BigDecimal storageLatitude;
    private BigDecimal storageLongitude;
    private Long storageId;

    private Integer representativeImageIndex;
}
