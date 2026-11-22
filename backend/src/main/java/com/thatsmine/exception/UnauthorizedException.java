package com.thatsmine.exception;

/** 로그인이 필요하거나, 로그인 정보가 더 이상 유효하지 않을 때(401). */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
