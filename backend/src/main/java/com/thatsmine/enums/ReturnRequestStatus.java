package com.thatsmine.enums;

public enum ReturnRequestStatus {
    PENDING("PENDING"),
    APPROVED("APPROVED"),
    REJECTED("REJECTED"),
    COMPLETED("COMPLETED"),
    CANCELLED("CANCELLED");

    private final String value;

    ReturnRequestStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ReturnRequestStatus fromValue(String value) {
        for (ReturnRequestStatus status : ReturnRequestStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid ReturnRequestStatus: " + value);
    }
}
