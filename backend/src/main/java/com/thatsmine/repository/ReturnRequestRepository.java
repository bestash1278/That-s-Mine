package com.thatsmine.repository;

import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.enums.ReturnRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    List<ReturnRequest> findByItemIdAndStatus(Long itemId, ReturnRequestStatus status);
    List<ReturnRequest> findByRequesterIdOrderByCreatedAtDesc(Long requesterId);
    List<ReturnRequest> findByItemIdOrderByCreatedAtDesc(Long itemId);
    List<ReturnRequest> findByStatusOrderByCreatedAtDesc(ReturnRequestStatus status);
}
