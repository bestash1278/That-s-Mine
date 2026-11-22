package com.thatsmine.entity;

import com.thatsmine.enums.ReturnRequestStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests", indexes = {
    @Index(name = "idx_return_requests_item", columnList = "item_id"),
    @Index(name = "idx_return_requests_requester", columnList = "requester_id"),
    @Index(name = "idx_return_requests_status", columnList = "status")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private FoundItem item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    private String ownershipDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReturnRequestStatus status;

    private String reviewComment;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime processedAt;

    /** 상태 변경. 허용 여부는 서비스(ReturnPolicy)에서 먼저 검증한다. */
    public void changeStatus(ReturnRequestStatus next, String reviewComment) {
        this.status = next;
        if (reviewComment != null) {
            this.reviewComment = reviewComment;
        }
        this.processedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = ReturnRequestStatus.PENDING;
        }
    }
}
