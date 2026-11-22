package com.thatsmine.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 교내 건물 등록·수정. 좌표는 실제 값처럼 확정하지 않고 관리자가 설정한다. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuildingRequest {
    private String buildingName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String description;
}
