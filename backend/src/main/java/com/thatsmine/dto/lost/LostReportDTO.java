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
import java.util.List;

/**
 * 분실 신고 상세. 신고자 정보(이메일·닉네임)는 넣지 않는다.
 * 수정 가능 여부(contentEditable, lockReason 등)는 본인에게만 채운다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LostReportDTO {
    private Long reportId;
    private String receiptNo;
    private String title;
    private String description;
    private Long categoryId;
    private String categoryName;
    private LocalDate lostDate;
    private LocalDate lostEndDate;
    private Long lostBuildingId;
    private String lostBuildingName;
    private String lostLocation;
    private String lostLocationDetail;
    private BigDecimal lostLatitude;
    private BigDecimal lostLongitude;
    /** 지도 표시 좌표. 지도에서 고른 지점이 없으면 건물 좌표(markerApproximate=true) */
    private BigDecimal markerLatitude;
    private BigDecimal markerLongitude;
    private Boolean markerApproximate;
    private LostReportStatus status;
    private String statusLabel;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 로그인한 사용자 본인의 신고인지 */
    private boolean mine;
    // ---- 본인에게만
    private Boolean contentEditable;
    private Boolean deletable;
    private String lockReason;

    public static LostReportDTO from(LostReport report, List<String> imageUrls, boolean mine, String lockReason) {
        CampusBuilding building = report.getLostBuilding();
        BigDecimal markerLat = report.getLostLatitude();
        BigDecimal markerLng = report.getLostLongitude();
        boolean approximate = false;
        if ((markerLat == null || markerLng == null) && building != null) {
            markerLat = building.getLatitude();
            markerLng = building.getLongitude();
            approximate = markerLat != null && markerLng != null;
        }
        LostReportDTOBuilder builder = LostReportDTO.builder()
                .reportId(report.getReportId())
                .receiptNo(ReceiptNumbers.lostReport(report.getReportId()))
                .title(report.getTitle())
                .description(report.getDescription())
                .categoryId(report.getCategory().getCategoryId())
                .categoryName(report.getCategory().getCategoryName())
                .lostDate(report.getLostDate())
                .lostEndDate(report.getLostEndDate())
                .lostBuildingId(building != null ? building.getBuildingId() : null)
                .lostBuildingName(building != null ? building.getBuildingName() : null)
                .lostLocation(report.getLostLocation())
                .lostLocationDetail(report.getLostLocationDetail())
                .lostLatitude(report.getLostLatitude())
                .lostLongitude(report.getLostLongitude())
                .markerLatitude(markerLat)
                .markerLongitude(markerLng)
                .markerApproximate(approximate)
                .status(report.getStatus())
                .statusLabel(report.getStatus().getLabel())
                .imageUrls(imageUrls)
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .mine(mine);
        if (mine) {
            builder.contentEditable(lockReason == null)
                    .deletable(true)
                    .lockReason(lockReason);
        }
        return builder.build();
    }
}
