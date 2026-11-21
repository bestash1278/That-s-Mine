package com.thatsmine.enums;

public enum FoundItemStatus {
    REPORTED("REPORTED", "신고됨"),
    STORED("STORED", "보관 중"),
    RETURN_PENDING("RETURN_PENDING", "반환 대기"),
    RETURNED("RETURNED", "반환됨"),
    HIDDEN("HIDDEN", "숨김");

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
        throw new IllegalArgumentException("Invalid FoundItemStatus: " + value);
    }
}
