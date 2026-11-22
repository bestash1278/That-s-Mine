package com.thatsmine.dto.me;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thatsmine.dto.FoundItemListItemDTO;
import com.thatsmine.dto.ReceiptNumbers;
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

/**
 * 신고자 본인용 습득물 상세(수정 화면). 비공개 특징이 들어 있으므로 본인에게만 준다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MyFoundItemDetailDTO {
    private Long itemId;
    private String itemNo;
    private Long categoryId;
    private String title;
    private String description;
    private String privateFeatures;
    private LocalDate foundDate;
    private LocalTime foundTime;
    private Long foundBuildingId;
    private String foundBuildingName;
    private String foundLocation;
    private String foundLocationDetail;
    private BigDecimal foundLatitude;
    private BigDecimal foundLongitude;
    private FoundItemStatus status;
    private String statusLabel;
    private CustodyType custodyType;
    private String custodyTypeLabel;
    private Long storageId;
    private String storageLocation;
    private String storageLocationDetail;
    private BigDecimal storageLatitude;
    private BigDecimal storageLongitude;
    private String storageStatusLabel;
    private List<String> imageUrls;
    private boolean editable;
    private String lockReason;

    public static MyFoundItemDetailDTO from(FoundItem item, List<String> imageUrls, String lockReason) {
        return MyFoundItemDetailDTO.builder()
                .itemId(item.getItemId())
                .itemNo(ReceiptNumbers.foundItem(item.getItemId()))
                .categoryId(item.getCategory().getCategoryId())
                .title(item.getTitle())
                .description(item.getDescription())
                .privateFeatures(item.getPrivateFeatures())
                .foundDate(item.getFoundDate())
                .foundTime(item.getFoundTime())
                .foundBuildingId(item.getFoundBuilding() != null ? item.getFoundBuilding().getBuildingId() : null)
                .foundBuildingName(item.getFoundBuilding() != null ? item.getFoundBuilding().getBuildingName() : null)
                .foundLocation(item.getFoundLocation())
                .foundLocationDetail(item.getFoundLocationDetail())
                .foundLatitude(item.getFoundLatitude())
                .foundLongitude(item.getFoundLongitude())
                .status(item.getStatus())
                .statusLabel(item.getStatus().getLabel())
                .custodyType(item.getCustodyType())
                .storageId(item.getStorage() != null ? item.getStorage().getStorageId() : null)
                .storageLocation(item.getStorageLocation())
                .storageLocationDetail(item.getStorageLocationDetail())
                .storageLatitude(item.getStorageLatitude())
                .storageLongitude(item.getStorageLongitude())
                .custodyTypeLabel(item.getCustodyType() != null ? item.getCustodyType().getLabel() : null)
                .storageStatusLabel(FoundItemListItemDTO.getStorageStatusLabel(item))
                .imageUrls(imageUrls)
                .editable(lockReason == null)
                .lockReason(lockReason)
                .build();
    }
}
