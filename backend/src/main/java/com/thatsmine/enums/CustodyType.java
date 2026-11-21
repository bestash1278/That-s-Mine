package com.thatsmine.enums;

public enum CustodyType {
    PENDING_HANDOVER("PENDING_HANDOVER"),
    HANDED_OVER("HANDED_OVER"),
    TEMPORARY("TEMPORARY");

    private final String value;

    CustodyType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CustodyType fromValue(String value) {
        for (CustodyType type : CustodyType.values()) {
            if (type.value.equals(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Invalid CustodyType: " + value);
    }
}
