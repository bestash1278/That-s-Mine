package com.thatsmine.repository;

import com.thatsmine.entity.FoundItem;
import com.thatsmine.enums.FoundItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
