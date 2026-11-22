package com.thatsmine.enums;

public enum CustodyType {
    PENDING_HANDOVER("PENDING_HANDOVER", "관리 부서에 전달 예정"),
    HANDED_OVER("HANDED_OVER", "관리 부서에 전달 완료"),
    TEMPORARY("TEMPORARY", "습득자가 임시 보관 중");

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
        throw new IllegalArgumentException("올바르지 않은 보관 유형입니다: " + value);
    }
}
