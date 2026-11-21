package com.thatsmine.enums;

public enum LostReportStatus {
    SEARCHING("SEARCHING"),
    FOUND("FOUND"),
    CLOSED("CLOSED");

    private final String value;

    LostReportStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static LostReportStatus fromValue(String value) {
        for (LostReportStatus status : LostReportStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid LostReportStatus: " + value);
    }
}
