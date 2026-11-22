package com.thatsmine.dto.returns;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 관리자의 반환 신청 처리. status는 APPROVED | REJECTED | COMPLETED, 반려 때는 사유(comment)가 필요하다. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewReturnRequestRequest {
    private String status;
    private String comment;
}
