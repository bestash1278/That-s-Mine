package com.thatsmine.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 관리자의 습득물 처리 상태 변경. status는 REPORTED | STORED | HIDDEN */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeItemStatusRequest {
    private String status;
}
