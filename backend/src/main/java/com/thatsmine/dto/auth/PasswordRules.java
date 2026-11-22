package com.thatsmine.dto.auth;

/** 비밀번호 규칙: 8~64자, 영문과 숫자를 각각 1개 이상. 프론트(utils/authValidation.js)와 같아야 한다. */
public final class PasswordRules {
    public static final String PATTERN = "^(?=.*[A-Za-z])(?=.*\\d).+$";
    public static final String MESSAGE = "비밀번호에는 영문과 숫자가 각각 1개 이상 들어가야 합니다.";

    private PasswordRules() {
    }
}
