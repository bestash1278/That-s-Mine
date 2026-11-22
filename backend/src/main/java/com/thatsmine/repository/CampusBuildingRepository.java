package com.thatsmine.repository;

import com.thatsmine.entity.CampusBuilding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CampusBuildingRepository extends JpaRepository<CampusBuilding, Long> {
    List<CampusBuilding> findAllByOrderByBuildingNameAsc();

    Optional<CampusBuilding> findByBuildingName(String buildingName);
}
