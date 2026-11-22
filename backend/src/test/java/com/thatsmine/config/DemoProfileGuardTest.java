package com.thatsmine.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("demo 프로필: 시연 계정 비밀번호는 환경변수로만")
class DemoProfileGuardTest {

    @Test
    @DisplayName("비밀번호가 없으면 시작 실패 + 한국어 안내(환경변수 이름 포함)")
    void missingPassword() {
        assertThatThrownBy(() -> new DemoProfileGuard(""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DEMO_ACCOUNT_PASSWORD")
                .hasMessageContaining("설정되지 않았습니다");
        assertThatThrownBy(() -> new DemoProfileGuard("   ")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new DemoProfileGuard(null)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("너무 짧은 비밀번호도 거절")
    void tooShort() {
        assertThatThrownBy(() -> new DemoProfileGuard("short"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("너무 짧습니다");
    }

    @Test
    @DisplayName("충분한 길이면 통과")
    void valid() {
        assertThatCode(() -> new DemoProfileGuard("a-long-enough-password")).doesNotThrowAnyException();
    }
}
