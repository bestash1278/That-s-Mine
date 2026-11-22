package com.thatsmine.dto;

import com.thatsmine.entity.CampusBuilding;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampusBuildingDTO {
    private Long buildingId;
    private String buildingName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String description;

    public static CampusBuildingDTO from(CampusBuilding building) {
        return CampusBuildingDTO.builder()
                .buildingId(building.getBuildingId())
                .buildingName(building.getBuildingName())
                .latitude(building.getLatitude())
                .longitude(building.getLongitude())
                .description(building.getDescription())
                .build();
    }
}
