package com.thatsmine.exception;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 여러 입력 항목의 검증 오류를 한 번에 돌려줄 때 사용한다.
 * 응답: 400 { code: "VALIDATION_ERROR", message, fieldErrors: { 필드명: 메시지 } }
 */
public class FieldValidationException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public FieldValidationException(Map<String, String> fieldErrors) {
        super(fieldErrors.size() + "개 항목을 확인해 주세요.");
        this.fieldErrors = Collections.unmodifiableMap(new LinkedHashMap<>(fieldErrors));
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
