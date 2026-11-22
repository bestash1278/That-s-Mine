package com.thatsmine.service;

import com.thatsmine.dto.CampusBuildingDTO;
import com.thatsmine.dto.CategoryDTO;
import com.thatsmine.dto.StorageInfoDTO;
import com.thatsmine.entity.StorageLocation;
import com.thatsmine.repository.CampusBuildingRepository;
import com.thatsmine.repository.CategoryRepository;
import com.thatsmine.repository.StorageLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** 카테고리, 교내 건물, 공식 보관 장소 같은 기준 데이터 조회. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReferenceDataService {

    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;

    public List<CategoryDTO> getCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(CategoryDTO::from)
                .toList();
    }

    public List<CampusBuildingDTO> getCampusBuildings() {
        return campusBuildingRepository.findAllByOrderByBuildingNameAsc().stream()
                .map(CampusBuildingDTO::from)
                .toList();
    }

    /** 활성화된 공식 보관 장소. buildingId가 있으면 해당 건물만. */
    public List<StorageInfoDTO> getStorageLocations(Long buildingId) {
        List<StorageLocation> locations = buildingId == null
                ? storageLocationRepository.findByActiveTrueOrderByStorageNameAsc()
                : storageLocationRepository.findByBuilding_BuildingIdAndActiveTrueOrderByStorageNameAsc(buildingId);
        return locations.stream()
                .map(StorageInfoDTO::from)
                .toList();
    }
}
