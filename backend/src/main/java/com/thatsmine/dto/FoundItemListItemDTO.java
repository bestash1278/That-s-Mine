package com.thatsmine.dto;

import com.thatsmine.entity.FoundItem;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoundItemListItemDTO {
    private Long itemId;
    private String title;
    private String categoryName;
    private LocalDate foundDate;
    private String foundLocation;
    private String foundBuildingName;
    private FoundItemStatus status;
    private String statusLabel;
    private String firstImageUrl;

    private String storageStatusLabel;
    private String storageName;

    public static FoundItemListItemDTO from(FoundItem item, String firstImageUrl) {
        String storageStatusLabel = getStorageStatusLabel(item);
        String storageName = getStorageName(item);

        return FoundItemListItemDTO.builder()
                .itemId(item.getItemId())
                .title(item.getTitle())
                .categoryName(item.getCategory().getCategoryName())
                .foundDate(item.getFoundDate())
                .foundLocation(item.getFoundLocation())
                .foundBuildingName(item.getFoundBuilding() != null ? item.getFoundBuilding().getBuildingName() : null)
                .status(item.getStatus())
                .statusLabel(item.getStatus().getLabel())
                .firstImageUrl(firstImageUrl)
                .storageStatusLabel(storageStatusLabel)
                .storageName(storageName)
                .build();
    }

    private static String getStorageStatusLabel(FoundItem item) {
        if (item.getStatus() == FoundItemStatus.REPORTED) {
            return "보관 장소 확인 중";
        }
        if (item.getCustodyType() == CustodyType.PENDING_HANDOVER) {
            return "보관 장소 확인 중";
        }
        if (item.getStorage() != null) {
            return item.getStorage().getStorageName();
        }
        return "보관 장소 확인 중";
    }

    private static String getStorageName(FoundItem item) {
        if (item.getStorage() != null) {
            return item.getStorage().getStorageName();
        }
        return null;
    }
}
