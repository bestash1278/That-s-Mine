package com.thatsmine.repository;

import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.enums.ReturnRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

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
}
