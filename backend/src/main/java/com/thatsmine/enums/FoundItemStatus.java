package com.thatsmine.enums;

public enum FoundItemStatus {
    REPORTED("REPORTED"),
    STORED("STORED"),
    RETURN_PENDING("RETURN_PENDING"),
    RETURNED("RETURNED"),
    HIDDEN("HIDDEN");

    private final String value;

    FoundItemStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
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
