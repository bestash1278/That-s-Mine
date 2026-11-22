package com.thatsmine.repository;

import com.thatsmine.entity.FoundItem;
import com.thatsmine.enums.FoundItemStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
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

    /**
     * 공개 검색. 검색어는 동의어 확장 결과 중 최대 3개(kw1~kw3)를 OR로 비교한다.
     * 이전에는 확장 결과를 "a|b"로 이어 붙여 LIKE에 넣어서, 동의어가 있는 검색어는 결과가 0건이었다.
     * private_features는 검색 대상에 넣지 않는다(비공개 특징이 검색으로 추측되지 않게).
     * status를 지정하지 않으면 숨김(excludedStatus) 물품은 제외한다.
     */
    @Query("SELECT f FROM FoundItem f " +
            "WHERE f.deletedAt IS NULL " +
            "AND (:kw1 IS NULL " +
            "     OR LOWER(f.title) LIKE LOWER(CONCAT('%', :kw1, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :kw1, '%')) " +
            "     OR LOWER(f.title) LIKE LOWER(CONCAT('%', :kw2, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :kw2, '%')) " +
            "     OR LOWER(f.title) LIKE LOWER(CONCAT('%', :kw3, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :kw3, '%'))) " +
            "AND (:categoryId IS NULL OR f.category.categoryId = :categoryId) " +
            "AND (:buildingId IS NULL OR f.foundBuilding.buildingId = :buildingId) " +
            "AND ((:status IS NULL AND f.status <> :excludedStatus) OR f.status = :status) " +
            "AND (:startDate IS NULL OR f.foundDate >= :startDate) " +
            "AND (:endDate IS NULL OR f.foundDate <= :endDate)")
    Page<FoundItem> search(
            @Param("kw1") String kw1,
            @Param("kw2") String kw2,
            @Param("kw3") String kw3,
            @Param("categoryId") Long categoryId,
            @Param("buildingId") Long buildingId,
            @Param("status") FoundItemStatus status,
            @Param("excludedStatus") FoundItemStatus excludedStatus,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    /**
     * 지도 영역 검색. 발견 좌표가 없으면(건물만 선택한 신고) 발견 건물 좌표로 대신 판단한다.
     */
    @Query("SELECT f FROM FoundItem f LEFT JOIN f.foundBuilding b " +
            "WHERE f.deletedAt IS NULL " +
            "AND COALESCE(f.foundLatitude, b.latitude) BETWEEN :minLat AND :maxLat " +
            "AND COALESCE(f.foundLongitude, b.longitude) BETWEEN :minLng AND :maxLng " +
            "AND (:kw1 IS NULL " +
            "     OR LOWER(f.title) LIKE LOWER(CONCAT('%', :kw1, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :kw1, '%')) " +
            "     OR LOWER(f.title) LIKE LOWER(CONCAT('%', :kw2, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :kw2, '%')) " +
            "     OR LOWER(f.title) LIKE LOWER(CONCAT('%', :kw3, '%')) OR LOWER(f.description) LIKE LOWER(CONCAT('%', :kw3, '%'))) " +
            "AND (:categoryId IS NULL OR f.category.categoryId = :categoryId) " +
            "AND ((:status IS NULL AND f.status <> :excludedStatus) OR f.status = :status) " +
            "AND (:startDate IS NULL OR f.foundDate >= :startDate) " +
            "AND (:endDate IS NULL OR f.foundDate <= :endDate) " +
            "ORDER BY f.createdAt DESC")
    List<FoundItem> searchByMapBounds(
            @Param("minLat") BigDecimal minLat,
            @Param("maxLat") BigDecimal maxLat,
            @Param("minLng") BigDecimal minLng,
            @Param("maxLng") BigDecimal maxLng,
            @Param("kw1") String kw1,
            @Param("kw2") String kw2,
            @Param("kw3") String kw3,
            @Param("categoryId") Long categoryId,
            @Param("status") FoundItemStatus status,
            @Param("excludedStatus") FoundItemStatus excludedStatus,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    /** 마이페이지: 내가 신고한 습득물 (숨김 포함, 삭제 제외). 정렬은 Pageable로 */
    Page<FoundItem> findByReporter_UserIdAndDeletedAtIsNull(Long reporterId, Pageable pageable);

    // 정렬은 Pageable(createdAt DESC)로 지정한다.
    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.status <> :excludedStatus")
    Page<FoundItem> findRecentNotDeleted(@Param("excludedStatus") FoundItemStatus excludedStatus, Pageable pageable);
    /**
     * 반환 신청·상태 변경처럼 같은 물품을 동시에 바꾸면 안 되는 작업용. 행 잠금(SELECT ... FOR UPDATE)을 걸어
     * 한 번에 한 요청만 처리하게 한다(중복 반환 방지).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FoundItem f WHERE f.deletedAt IS NULL AND f.itemId = :itemId")
    Optional<FoundItem> findByIdForUpdate(@Param("itemId") Long itemId);

    /** 관리자 목록: 숨김 포함 모든 상태(삭제 제외). 비공개 특징·보관 장소도 검색 대상이다. */
    @Query("SELECT f FROM FoundItem f " +
            "WHERE f.deletedAt IS NULL " +
            "AND (:keyword IS NULL OR LOWER(f.title) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(f.description) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(f.privateFeatures) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "     OR LOWER(f.foundLocation) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:status IS NULL OR f.status = :status) " +
            "AND (:categoryId IS NULL OR f.category.categoryId = :categoryId)")
    Page<FoundItem> searchForAdmin(@Param("keyword") String keyword,
                                   @Param("status") FoundItemStatus status,
                                   @Param("categoryId") Long categoryId,
                                   Pageable pageable);
}
