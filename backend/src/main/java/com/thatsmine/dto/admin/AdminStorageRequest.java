package com.thatsmine.dto.admin;

import com.thatsmine.enums.CustodyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 관리자의 실제 보관 위치 지정. 전달 완료(HANDED_OVER)일 때만 장소를 저장한다. */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminStorageRequest {
    private CustodyType custodyType;
    private Long storageId;
    private String storageLocation;
    private String storageLocationDetail;
    private BigDecimal storageLatitude;
    private BigDecimal storageLongitude;
}
