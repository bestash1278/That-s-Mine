package com.thatsmine.dto;

/** 화면에 보여줄 접수 번호. DB의 ID를 그대로 쓰되 종류를 구분하는 접두어를 붙인다. */
public final class ReceiptNumbers {

    private ReceiptNumbers() {
    }

    /** 분실 신고 접수 번호: LR-000123 */
    public static String lostReport(Long id) {
        return id == null ? null : String.format("LR-%06d", id);
    }

    /** 습득물 등록 번호: FI-000123 */
    public static String foundItem(Long id) {
        return id == null ? null : String.format("FI-%06d", id);
    }
}
