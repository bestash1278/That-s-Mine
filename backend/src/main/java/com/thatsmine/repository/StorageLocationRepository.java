package com.thatsmine.repository;

import com.thatsmine.entity.StorageLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StorageLocationRepository extends JpaRepository<StorageLocation, Long> {
    List<StorageLocation> findByBuilding_BuildingIdAndActiveTrueOrderByStorageNameAsc(Long buildingId);

    List<StorageLocation> findByActiveTrueOrderByStorageNameAsc();
}
