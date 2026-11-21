package com.thatsmine.repository;

import com.thatsmine.entity.LostReport;
import com.thatsmine.enums.LostReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LostReportRepository extends JpaRepository<LostReport, Long> {
    @Query("SELECT l FROM LostReport l WHERE l.deletedAt IS NULL AND l.reportId = :reportId")
    Optional<LostReport> findByIdNotDeleted(@Param("reportId") Long reportId);

    @Query("SELECT l FROM LostReport l WHERE l.deletedAt IS NULL AND l.status = :status")
    List<LostReport> findByStatusNotDeleted(@Param("status") LostReportStatus status);

    @Query("SELECT l FROM LostReport l WHERE l.deletedAt IS NULL AND l.user.userId = :userId")
    List<LostReport> findByUserIdNotDeleted(@Param("userId") Long userId);

    @Query("SELECT l FROM LostReport l WHERE l.deletedAt IS NULL ORDER BY l.createdAt DESC")
    List<LostReport> findAllNotDeleted();
}
