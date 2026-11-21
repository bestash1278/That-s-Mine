package com.thatsmine.enums;

public enum CustodyType {
    PENDING_HANDOVER("PENDING_HANDOVER", "인수 대기"),
    HANDED_OVER("HANDED_OVER", "인수 완료"),
    TEMPORARY("TEMPORARY", "임시 보관");

    private final String value;
    private final String label;

    CustodyType(String value, String label) {
        this.value = value;
        this.label = label;
    }

    public String getValue() {
        return value;
    }

    public String getLabel() {
        return label;
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
