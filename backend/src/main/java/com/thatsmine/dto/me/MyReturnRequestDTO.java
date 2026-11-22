package com.thatsmine.dto.me;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.enums.ReturnRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 마이페이지 '반환 신청 내역'. 신청자 본인에게만 주므로 본인이 쓴 소유 확인 설명을 포함한다.
 * 습득자의 비공개 특징은 넣지 않는다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MyReturnRequestDTO {
    private Long requestId;
    private Long itemId;
    private String itemTitle;
    private String itemThumbnailUrl;
    /** 물품이 삭제·숨김 처리되어 상세 화면을 열 수 없으면 false */
    private boolean itemViewable;
    private String ownershipDescription;
    private ReturnRequestStatus status;
    private String statusLabel;
    private String reviewComment;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;

    public static MyReturnRequestDTO from(ReturnRequest request, String thumbnailUrl, boolean itemViewable) {
        FoundItem item = request.getItem();
        return MyReturnRequestDTO.builder()
                .requestId(request.getRequestId())
                .itemId(item.getItemId())
                .itemTitle(item.getTitle())
                .itemThumbnailUrl(itemViewable ? thumbnailUrl : null)
                .itemViewable(itemViewable)
                .ownershipDescription(request.getOwnershipDescription())
                .status(request.getStatus())
                .statusLabel(request.getStatus().getLabel())
                .reviewComment(request.getReviewComment())
                .createdAt(request.getCreatedAt())
                .processedAt(request.getProcessedAt())
                .build();
    }
}
