package com.thatsmine.dto.lost;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thatsmine.dto.ReceiptNumbers;
import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.LostReport;
import com.thatsmine.enums.LostReportStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 분실 신고 목록·지도·마이페이지 카드 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LostReportSummaryDTO {
    private Long reportId;
    private String receiptNo;
    private String title;
    private String categoryName;
    private LocalDate lostDate;
    private LocalDate lostEndDate;
    private String lostLocation;
    private String lostBuildingName;
    private String lostLocationDetail;
    private BigDecimal markerLatitude;
    private BigDecimal markerLongitude;
    private Boolean markerApproximate;
    private LostReportStatus status;
    private String statusLabel;
    private String thumbnailUrl;
    private LocalDateTime createdAt;

    // ---- 마이페이지(본인)에서만
    private Boolean contentEditable;
    private Boolean deletable;
    private String lockReason;
    /** 유사 습득물 수. 추천 기능(11단계) 전에는 null */
    private Integer similarItemCount;

    public static LostReportSummaryDTO from(LostReport report, String thumbnailUrl) {
        CampusBuilding building = report.getLostBuilding();
        BigDecimal markerLat = report.getLostLatitude();
        BigDecimal markerLng = report.getLostLongitude();
        boolean approximate = false;
        if ((markerLat == null || markerLng == null) && building != null) {
            markerLat = building.getLatitude();
            markerLng = building.getLongitude();
            approximate = markerLat != null && markerLng != null;
        }
        return LostReportSummaryDTO.builder()
                .reportId(report.getReportId())
                .receiptNo(ReceiptNumbers.lostReport(report.getReportId()))
                .title(report.getTitle())
                .categoryName(report.getCategory().getCategoryName())
                .lostDate(report.getLostDate())
                .lostEndDate(report.getLostEndDate())
                .lostLocation(report.getLostLocation())
                .lostBuildingName(building != null ? building.getBuildingName() : null)
                .lostLocationDetail(report.getLostLocationDetail())
                .markerLatitude(markerLat)
                .markerLongitude(markerLng)
                .markerApproximate(approximate)
                .status(report.getStatus())
                .statusLabel(report.getStatus().getLabel())
                .thumbnailUrl(thumbnailUrl)
                .createdAt(report.getCreatedAt())
                .build();
    }

    /** 마이페이지 카드: 수정·삭제 가능 여부를 함께 */
    public static LostReportSummaryDTO forOwner(LostReport report, String thumbnailUrl, String lockReason) {
        LostReportSummaryDTO dto = from(report, thumbnailUrl);
        dto.contentEditable = lockReason == null;
        dto.deletable = true;
        dto.lockReason = lockReason;
        return dto;
    }
}
