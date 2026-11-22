package com.thatsmine.controller;

import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.CampusBuildingDTO;
import com.thatsmine.dto.CategoryDTO;
import com.thatsmine.dto.StorageInfoDTO;
import com.thatsmine.service.ReferenceDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** SPEC §20 장소 및 카테고리 API */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReferenceDataController {

    private final ReferenceDataService referenceDataService;

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<CategoryDTO>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "카테고리 조회 완료",
                referenceDataService.getCategories()));
    }

    @GetMapping("/campus-buildings")
    public ResponseEntity<ApiResponse<List<CampusBuildingDTO>>> getCampusBuildings() {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "건물 조회 완료",
                referenceDataService.getCampusBuildings()));
    }

    @GetMapping("/storage-locations")
    public ResponseEntity<ApiResponse<List<StorageInfoDTO>>> getStorageLocations(
            @RequestParam(required = false) Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "보관 장소 조회 완료",
                referenceDataService.getStorageLocations(buildingId)));
    }
}
