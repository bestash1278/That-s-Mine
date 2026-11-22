package com.thatsmine.enums;

import java.util.EnumSet;
import java.util.Set;

public enum ReturnRequestStatus {
    PENDING("PENDING", "신청 대기"),
    APPROVED("APPROVED", "승인"),
    REJECTED("REJECTED", "반려"),
    COMPLETED("COMPLETED", "반환 완료"),
    CANCELLED("CANCELLED", "신청 취소");

    /** 처리가 끝나지 않은 신청. 이런 신청이 있는 습득물은 신고자가 수정·삭제할 수 없다. */
    public static final Set<ReturnRequestStatus> ACTIVE = EnumSet.of(PENDING, APPROVED);

    private final String value;
    private final String label;

    ReturnRequestStatus(String value, String label) {
        this.value = value;
        this.label = label;
    }

    public String getValue() {
        return value;
    }

    public String getLabel() {
        return label;
    }

    public static ReturnRequestStatus fromValue(String value) {
        for (ReturnRequestStatus status : ReturnRequestStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("올바르지 않은 반환 신청 상태입니다: " + value);
    }
}
