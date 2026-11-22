package com.thatsmine.repository;

import com.thatsmine.entity.LostReport;
import com.thatsmine.enums.LostReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    /** 마이페이지: 내 분실 신고 (모든 상태, 삭제 제외). 정렬은 Pageable로 */
    Page<LostReport> findByUser_UserIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    /**
     * 공개 목록. 날짜 조건은 분실 추정 기간 [lostDate, lostEndDate(없으면 lostDate)]이
     * 검색 기간 [startDate, endDate]와 겹치는지로 판단한다.
     */
    @Query("SELECT l FROM LostReport l " +
            "WHERE l.deletedAt IS NULL AND l.status = :status " +
            "AND (:kw1 IS NULL " +
            "     OR LOWER(l.title) LIKE LOWER(CONCAT('%', :kw1, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :kw1, '%')) " +
            "     OR LOWER(l.title) LIKE LOWER(CONCAT('%', :kw2, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :kw2, '%')) " +
            "     OR LOWER(l.title) LIKE LOWER(CONCAT('%', :kw3, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :kw3, '%'))) " +
            "AND (:categoryId IS NULL OR l.category.categoryId = :categoryId) " +
            "AND (:endDate IS NULL OR l.lostDate <= :endDate) " +
            "AND (:startDate IS NULL OR COALESCE(l.lostEndDate, l.lostDate) >= :startDate)")
    Page<LostReport> search(
            @Param("kw1") String kw1,
            @Param("kw2") String kw2,
            @Param("kw3") String kw3,
            @Param("categoryId") Long categoryId,
            @Param("status") LostReportStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    /**
     * 지도 영역 검색(찾는 중인 신고만). 지도에서 고른 좌표가 없으면 대표 건물 좌표로 판단한다.
     */
    @Query("SELECT l FROM LostReport l LEFT JOIN l.lostBuilding b " +
            "WHERE l.deletedAt IS NULL AND l.status = :status " +
            "AND COALESCE(l.lostLatitude, b.latitude) BETWEEN :minLat AND :maxLat " +
            "AND COALESCE(l.lostLongitude, b.longitude) BETWEEN :minLng AND :maxLng " +
            "AND (:kw1 IS NULL " +
            "     OR LOWER(l.title) LIKE LOWER(CONCAT('%', :kw1, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :kw1, '%')) " +
            "     OR LOWER(l.title) LIKE LOWER(CONCAT('%', :kw2, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :kw2, '%')) " +
            "     OR LOWER(l.title) LIKE LOWER(CONCAT('%', :kw3, '%')) OR LOWER(l.description) LIKE LOWER(CONCAT('%', :kw3, '%'))) " +
            "AND (:categoryId IS NULL OR l.category.categoryId = :categoryId) " +
            "AND (:endDate IS NULL OR l.lostDate <= :endDate) " +
            "AND (:startDate IS NULL OR COALESCE(l.lostEndDate, l.lostDate) >= :startDate) " +
            "ORDER BY l.createdAt DESC")
    List<LostReport> searchByMapBounds(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("kw1") String kw1,
            @Param("kw2") String kw2,
            @Param("kw3") String kw3,
            @Param("categoryId") Long categoryId,
            @Param("status") LostReportStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
