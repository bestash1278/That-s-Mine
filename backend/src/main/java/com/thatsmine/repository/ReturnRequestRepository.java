package com.thatsmine.repository;

import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.enums.ReturnRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    // ReturnRequest는 item, requester 연관관계를 가지므로 경로를 밑줄로 명시한다.
    List<ReturnRequest> findByItem_ItemIdAndStatus(Long itemId, ReturnRequestStatus status);

    List<ReturnRequest> findByRequester_UserIdOrderByCreatedAtDesc(Long requesterId);

    List<ReturnRequest> findByItem_ItemIdOrderByCreatedAtDesc(Long itemId);

    List<ReturnRequest> findByStatusOrderByCreatedAtDesc(ReturnRequestStatus status);

    /** 마이페이지: 내 반환 신청. 정렬은 Pageable로 */
    Page<ReturnRequest> findByRequester_UserId(Long requesterId, Pageable pageable);

    /** 처리 중인 신청이 있는지 (수정·삭제 제한 판단) */
    boolean existsByItem_ItemIdAndStatusIn(Long itemId, Collection<ReturnRequestStatus> statuses);

    /** 목록 화면용: 주어진 물품 중 처리 중인 신청이 있는 물품 ID (물품마다 따로 조회하지 않게) */
    @Query("SELECT DISTINCT r.item.itemId FROM ReturnRequest r WHERE r.item.itemId IN :itemIds AND r.status IN :statuses")
    List<Long> findItemIdsWithStatusIn(@Param("itemIds") Collection<Long> itemIds,
                                       @Param("statuses") Collection<ReturnRequestStatus> statuses);

    /** 승인·반려·취소 처리용 행 잠금. 같은 신청을 동시에 처리하지 못하게 한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ReturnRequest r WHERE r.requestId = :requestId")
    Optional<ReturnRequest> findByIdForUpdate(@Param("requestId") Long requestId);

    /** 이 사용자가 이 물품에 대해 처리 중인 신청이 있는지 */
    boolean existsByItem_ItemIdAndRequester_UserIdAndStatusIn(Long itemId, Long userId, Collection<ReturnRequestStatus> statuses);

    /** 이 사용자의 이 물품에 대한 가장 최근 신청 */
    Optional<ReturnRequest> findFirstByItem_ItemIdAndRequester_UserIdOrderByCreatedAtDesc(Long itemId, Long userId);

    /** 관리자 목록. 상태를 지정하지 않으면 전체. 물품·신청자를 함께 읽어 목록에서 추가 조회가 없게 한다. */
    @Query(value = "SELECT r FROM ReturnRequest r JOIN FETCH r.item i JOIN FETCH r.requester u " +
            "WHERE (:status IS NULL OR r.status = :status)",
            countQuery = "SELECT COUNT(r) FROM ReturnRequest r WHERE (:status IS NULL OR r.status = :status)")
    Page<ReturnRequest> searchForAdmin(@Param("status") ReturnRequestStatus status, Pageable pageable);

    /** 잠금을 걸기 전에 물품 ID만 읽는다(엔티티를 먼저 읽어 오래된 상태가 남지 않게 하려고 값만 조회) */
    @Query("SELECT r.item.itemId FROM ReturnRequest r WHERE r.requestId = :requestId")
    Optional<Long> findItemIdByRequestId(@Param("requestId") Long requestId);

    long countByItem_ItemIdAndStatus(Long itemId, ReturnRequestStatus status);
}
