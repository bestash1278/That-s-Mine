package com.thatsmine.dto.returns;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.thatsmine.dto.me.MyReturnRequestDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 상세 화면의 '반환 신청' 영역용: 지금 신청할 수 있는지, 못 하면 이유, 내 최근 신청 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReturnEligibilityDTO {
    private boolean canRequest;
    private String blockReason;
    private MyReturnRequestDTO myRequest;
}
