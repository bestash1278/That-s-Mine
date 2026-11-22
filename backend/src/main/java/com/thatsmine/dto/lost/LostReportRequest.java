package com.thatsmine.dto.lost;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 분실 신고 등록·수정 요청 (multipart의 "request" 파트, JSON).
 * 수정 화면도 전체 값을 보낸다. 사진은 keepImageUrls(남길 기존 사진) + 새 images 파트로 구성한다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LostReportRequest {
    private Long categoryId;
    private String title;
    private String description;

    /** 분실 날짜(또는 추정 기간의 시작) */
    private LocalDate lostDate;
    /** 추정 기간의 끝(선택). 없으면 하루 */
    private LocalDate lostEndDate;

    /** 대표 추정 위치: 교내 건물을 고르거나(lostBuildingId) 장소 이름을 직접 입력(lostLocation) */
    private Long lostBuildingId;
    private String lostLocation;
    /** 추가 설명: "도서관 3층이나 학생식당 중 한 곳" 처럼 불확실한 부분 */
    private String lostLocationDetail;
    private BigDecimal lostLatitude;
    private BigDecimal lostLongitude;

    /** 새로 올린 사진 중 대표 사진 순번 */
    private Integer representativeImageIndex;
    /** 수정 시 남길 기존 사진 URL. null이면 기존 사진을 모두 남긴다 */
    private List<String> keepImageUrls;
    /** 수정 시 대표로 지정한 기존 사진 URL */
    private String representativeImageUrl;
}
