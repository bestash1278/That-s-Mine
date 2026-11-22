package com.thatsmine.exception;

/** 로그인했지만 그 데이터에 대한 권한이 없을 때(403). 예: 남의 신고 수정 */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
