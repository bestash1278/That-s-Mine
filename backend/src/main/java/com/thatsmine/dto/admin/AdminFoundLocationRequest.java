package com.thatsmine.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 관리자의 발견 위치 수정(잘못 입력된 위치 바로잡기). 보관 위치와는 별개다. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminFoundLocationRequest {
    private Long foundBuildingId;
    private String foundLocation;
    private String foundLocationDetail;
    private BigDecimal foundLatitude;
    private BigDecimal foundLongitude;
}
