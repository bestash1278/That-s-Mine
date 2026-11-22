package com.thatsmine.enums;

public enum FoundItemStatus {
    REPORTED("REPORTED", "신고 접수"),
    STORED("STORED", "보관 중"),
    RETURN_PENDING("RETURN_PENDING", "반환 진행 중"),
    RETURNED("RETURNED", "반환 완료"),
    HIDDEN("HIDDEN", "숨김 처리");

    private final String value;
    private final String label;

    FoundItemStatus(String value, String label) {
        this.value = value;
        this.label = label;
    }

    public String getValue() {
        return value;
    }

    public String getLabel() {
        return label;
    }

    public static FoundItemStatus fromValue(String value) {
        for (FoundItemStatus status : FoundItemStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("올바르지 않은 처리 상태입니다: " + value);
    }
}
