package com.thatsmine.dto.me;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thatsmine.dto.FoundItemListItemDTO;
import com.thatsmine.dto.ReceiptNumbers;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.enums.FoundItemStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 마이페이지 '내가 등록한 습득물' 카드 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MyFoundItemDTO {
    private Long itemId;
    private String itemNo;
    private String title;
    private String categoryName;
    private LocalDate foundDate;
    private String foundLocation;
    private FoundItemStatus status;
    private String statusLabel;
    private String storageStatusLabel;
    private String thumbnailUrl;
    private LocalDateTime createdAt;
    private boolean editable;
    private String lockReason;

    public static MyFoundItemDTO from(FoundItem item, String thumbnailUrl, String lockReason) {
        String location = item.getFoundBuilding() != null ? item.getFoundBuilding().getBuildingName() : item.getFoundLocation();
        return MyFoundItemDTO.builder()
                .itemId(item.getItemId())
                .itemNo(ReceiptNumbers.foundItem(item.getItemId()))
                .title(item.getTitle())
                .categoryName(item.getCategory().getCategoryName())
                .foundDate(item.getFoundDate())
                .foundLocation(location)
                .status(item.getStatus())
                .statusLabel(item.getStatus().getLabel())
                .storageStatusLabel(FoundItemListItemDTO.getStorageStatusLabel(item))
                .thumbnailUrl(thumbnailUrl)
                .createdAt(item.getCreatedAt())
                .editable(lockReason == null)
                .lockReason(lockReason)
                .build();
    }
}
