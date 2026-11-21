package com.thatsmine.repository;

import com.thatsmine.entity.CampusBuilding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CampusBuildingRepository extends JpaRepository<CampusBuilding, Long> {
}
