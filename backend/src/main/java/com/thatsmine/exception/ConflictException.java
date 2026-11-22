package com.thatsmine.exception;

/** 현재 상태에서는 할 수 없는 요청(반환 진행 중인 물품 수정 등) → 409 CONFLICT */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
