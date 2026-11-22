package com.thatsmine.dto.returns;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import com.thatsmine.service.ReturnPolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자용 반환 신청. 소유 확인 대조를 위해 신청자가 쓴 설명과 습득자의 비공개 특징을 함께 준다.
 * 일반 사용자 응답에는 절대 쓰지 않는다(공개 DTO와 분리).
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminReturnRequestDTO {
    private Long requestId;
    private Long itemId;
    private String itemTitle;
    private String itemThumbnailUrl;
    private FoundItemStatus itemStatus;
    private String itemStatusLabel;
    private String storageName;
    /** 습득자가 남긴 비공개 특징 (신청자 설명과 맞춰 보는 용도) */
    private String itemPrivateFeatures;

    private Long requesterId;
    private String requesterNickname;
    private String requesterEmail;

    private String ownershipDescription;
    private ReturnRequestStatus status;
    private String statusLabel;
    private String reviewComment;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;

    /** 서버가 계산한 "지금 할 수 있는 처리" (APPROVED, REJECTED, COMPLETED 중) */
    private List<String> allowedNext;

    public static AdminReturnRequestDTO from(ReturnRequest request, String thumbnailUrl) {
        FoundItem item = request.getItem();
        return AdminReturnRequestDTO.builder()
                .requestId(request.getRequestId())
                .itemId(item.getItemId())
                .itemTitle(item.getTitle())
                .itemThumbnailUrl(thumbnailUrl)
                .itemStatus(item.getStatus())
                .itemStatusLabel(item.getStatus().getLabel())
                .storageName(item.getStorage() != null ? item.getStorage().getStorageName() : item.getStorageLocation())
                .itemPrivateFeatures(item.getPrivateFeatures())
                .requesterId(request.getRequester().getUserId())
                .requesterNickname(request.getRequester().getNickname())
                .requesterEmail(request.getRequester().getEmail())
                .ownershipDescription(request.getOwnershipDescription())
                .status(request.getStatus())
                .statusLabel(request.getStatus().getLabel())
                .reviewComment(request.getReviewComment())
                .createdAt(request.getCreatedAt())
                .processedAt(request.getProcessedAt())
                .allowedNext(ReturnPolicy.nextStatuses(request.getStatus()).stream().map(ReturnRequestStatus::getValue).toList())
                .build();
    }
}
