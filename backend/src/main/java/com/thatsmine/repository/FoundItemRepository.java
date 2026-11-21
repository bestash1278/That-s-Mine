package com.thatsmine.repository;

import com.thatsmine.entity.FoundItem;
import com.thatsmine.enums.FoundItemStatus;
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
public interface FoundItemRepository extends JpaRepository<FoundItem, Long> {
    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.itemId = :itemId")
    Optional<FoundItem> findByIdNotDeleted(@Param("itemId") Long itemId);

    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.status = :status")
    List<FoundItem> findByStatusNotDeleted(@Param("status") FoundItemStatus status);

    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.category.categoryId = :categoryId")
    List<FoundItem> findByCategoryIdNotDeleted(@Param("categoryId") Long categoryId);

    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.foundDate = :foundDate")
    List<FoundItem> findByFoundDateNotDeleted(@Param("foundDate") LocalDate foundDate);

    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.reporter.userId = :reporterId")
    List<FoundItem> findByReporterIdNotDeleted(@Param("reporterId") Long reporterId);

    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL ORDER BY f.createdAt DESC")
    List<FoundItem> findAllNotDeleted();

    @Query(value = "SELECT f FROM FoundItem f " +
            "WHERE f.deletedAt IS NULL " +
            "AND (:keyword IS NULL OR LOWER(f.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:categoryId IS NULL OR f.category.categoryId = :categoryId) " +
            "AND (:buildingId IS NULL OR f.foundBuilding.buildingId = :buildingId) " +
            "AND (:status IS NULL OR f.status = :status) " +
            "AND (:startDate IS NULL OR f.foundDate >= :startDate) " +
            "AND (:endDate IS NULL OR f.foundDate <= :endDate)")
    Page<FoundItem> search(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("buildingId") Long buildingId,
            @Param("status") FoundItemStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    @Query(value = "SELECT f FROM FoundItem f " +
            "WHERE f.deletedAt IS NULL " +
            "AND f.foundLatitude BETWEEN :minLat AND :maxLat " +
            "AND f.foundLongitude BETWEEN :minLng AND :maxLng " +
            "AND (:keyword IS NULL OR LOWER(f.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:categoryId IS NULL OR f.category.categoryId = :categoryId) " +
            "AND (:status IS NULL OR f.status = :status) " +
            "AND (:startDate IS NULL OR f.foundDate >= :startDate) " +
            "AND (:endDate IS NULL OR f.foundDate <= :endDate)")
    List<FoundItem> searchByMapBounds(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("status") FoundItemStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL ORDER BY f.createdAt DESC")
    List<FoundItem> findRecentNotDeleted(Pageable pageable);
}
