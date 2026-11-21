package com.thatsmine.repository;

import com.thatsmine.entity.LostReportImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LostReportImageRepository extends JpaRepository<LostReportImage, Long> {
    List<LostReportImage> findByReportIdOrderBySortOrder(Long reportId);
}
