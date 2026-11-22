package com.thatsmine.enums;

public enum LostReportStatus {
    SEARCHING("SEARCHING", "찾는 중"),
    FOUND("FOUND", "찾기 완료"),
    CLOSED("CLOSED", "신고 종료");

    private final String value;
    private final String label;

    LostReportStatus(String value, String label) {
        this.value = value;
        this.label = label;
    }

    public String getValue() {
        return value;
    }

    public String getLabel() {
        return label;
    }

    public static LostReportStatus fromValue(String value) {
        for (LostReportStatus status : LostReportStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("올바르지 않은 분실 신고 상태입니다: " + value);
    }
}
