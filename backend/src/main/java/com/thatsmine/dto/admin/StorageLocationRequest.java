package com.thatsmine.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 공식 보관 장소 등록·수정 (문의처·운영 시간·수령 시 준비물 포함) */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageLocationRequest {
    private Long buildingId;
    private String storageName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String detailLocation;
    private String description;
    private String contactPhone;
    private String operatingHours;
    private String pickupGuide;
    /** 생략하면 사용 중(등록) 또는 현재 값 유지(수정) */
    private Boolean active;
}
