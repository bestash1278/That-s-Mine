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
import java.time.LocalTime;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicFoundItemDTO {
    private Long itemId;
    private String title;
    private String description;
    private String categoryName;
    private LocalDate foundDate;
    private LocalTime foundTime;
    private String foundLocation;
    private String foundLocationDetail;
    private BigDecimal foundLatitude;
    private BigDecimal foundLongitude;
    private String foundBuildingName;

    private FoundItemStatus status;
    private String statusLabel;

    private CustodyType custodyType;
    private String custodyTypeLabel;

    private String storageLocation;
    private String storageLocationDetail;
    private BigDecimal storageLatitude;
    private BigDecimal storageLongitude;
    private StorageInfoDTO storageInfo;

    private String storageStatusLabel;
    private String storageName;

    private List<String> imageUrls;

    public static PublicFoundItemDTO from(FoundItem item, List<String> imageUrls, StorageInfoDTO storageInfo) {
        String storageStatusLabel = getStorageStatusLabel(item);
        String storageName = getStorageName(item, storageInfo);

        return PublicFoundItemDTO.builder()
                .itemId(item.getItemId())
                .title(item.getTitle())
                .description(item.getDescription())
                .categoryName(item.getCategory().getCategoryName())
                .foundDate(item.getFoundDate())
                .foundTime(item.getFoundTime())
                .foundLocation(item.getFoundLocation())
                .foundLocationDetail(item.getFoundLocationDetail())
                .foundLatitude(item.getFoundLatitude())
                .foundLongitude(item.getFoundLongitude())
                .foundBuildingName(item.getFoundBuilding() != null ? item.getFoundBuilding().getBuildingName() : null)
                .status(item.getStatus())
                .statusLabel(item.getStatus().getLabel())
                .custodyType(item.getCustodyType())
                .custodyTypeLabel(item.getCustodyType() != null ? item.getCustodyType().getLabel() : null)
                .storageLocation(item.getStorageLocation())
                .storageLocationDetail(item.getStorageLocationDetail())
                .storageLatitude(item.getStorageLatitude())
                .storageLongitude(item.getStorageLongitude())
                .storageInfo(storageInfo)
                .storageStatusLabel(storageStatusLabel)
                .storageName(storageName)
                .imageUrls(imageUrls)
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

    private static String getStorageName(FoundItem item, StorageInfoDTO storageInfo) {
        if (storageInfo != null) {
            return storageInfo.getStorageName();
        }
        return null;
    }
}
