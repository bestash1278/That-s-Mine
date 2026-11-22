package com.thatsmine.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 배포 시연용 demo 프로필의 시작 조건. 시연 계정(관리자·일반 사용자)의 비밀번호는 환경변수
 * DEMO_ACCOUNT_PASSWORD로만 받고, 소스에 기본값을 두지 않는다. 없으면 서버가 시작하지 않는다.
 * (dev 프로필은 로컬 개발용이라 기본값이 있다)
 */
@Component
@Profile("demo")
public class DemoProfileGuard {

    static final int MIN_LENGTH = 8;

    public DemoProfileGuard(@Value("${demo.account-password:}") String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "시연 계정 비밀번호가 설정되지 않았습니다. 환경변수 DEMO_ACCOUNT_PASSWORD에 " + MIN_LENGTH
                            + "자 이상의 비밀번호를 넣어 주세요. (이 값은 소스에 저장하지 않고, 제출 때 따로 전달합니다)");
        }
        if (password.length() < MIN_LENGTH) {
            throw new IllegalStateException(
                    "시연 계정 비밀번호가 너무 짧습니다. DEMO_ACCOUNT_PASSWORD를 " + MIN_LENGTH + "자 이상으로 설정해 주세요.");
        }
    }
}
