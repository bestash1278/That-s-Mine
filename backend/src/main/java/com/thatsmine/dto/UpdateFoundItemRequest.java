package com.thatsmine.dto;

import com.thatsmine.enums.CustodyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * 습득물 수정 요청 (multipart의 "request" 파트, JSON). 수정 화면의 전체 값을 보낸다.
 * 처리 상태(신고 접수·보관 중 등)는 여기서 바꿀 수 없다(관리자 기능).
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateFoundItemRequest {
    private Long categoryId;
    private String title;
    private String description;
    private String privateFeatures;
    private LocalDate foundDate;
    private LocalTime foundTime;
    private Long foundBuildingId;
    private String foundLocation;
    private String foundLocationDetail;
    private BigDecimal foundLatitude;
    private BigDecimal foundLongitude;

    private CustodyType custodyType;
    private Long storageId;
    private String storageLocation;
    private String storageLocationDetail;
    private BigDecimal storageLatitude;
    private BigDecimal storageLongitude;

    /** 남길 기존 사진 URL. null이면 기존 사진을 모두 남긴다 */
    private List<String> keepImageUrls;
    private String representativeImageUrl;
    /** 새로 올린 사진 중 대표 사진 순번 */
    private Integer representativeImageIndex;
}
