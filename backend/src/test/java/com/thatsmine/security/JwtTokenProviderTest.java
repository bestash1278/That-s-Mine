package com.thatsmine.security;

import com.thatsmine.entity.User;
import com.thatsmine.enums.UserRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JWT 발급·검증")
class JwtTokenProviderTest {

    private static final String SECRET = "unit-test-secret-key-0123456789-abcdefgh";

    private User user(long id, UserRole role) {
        return User.builder().userId(id).email("a@test.local").passwordHash("x").nickname("a").role(role).build();
    }

    @Test
    void roundTrip() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, 60_000);
        String token = provider.createToken(user(7L, UserRole.ADMIN));

        AuthUser parsed = provider.parse(token).orElseThrow();
        assertThat(parsed.userId()).isEqualTo(7L);
        assertThat(parsed.role()).isEqualTo(UserRole.ADMIN);
        assertThat(parsed.isAdmin()).isTrue();
    }

    @Test
    @DisplayName("다른 키로 서명한 토큰(위조)은 거부")
    void forgedToken() {
        JwtTokenProvider mine = new JwtTokenProvider(SECRET, 60_000);
        JwtTokenProvider other = new JwtTokenProvider("another-secret-key-0123456789-abcdefgh", 60_000);
        String forged = other.createToken(user(1L, UserRole.ADMIN));
        assertThat(mine.parse(forged)).isEmpty();
    }

    @Test
    @DisplayName("만료된 토큰은 거부")
    void expiredToken() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, -1_000);
        assertThat(provider.parse(provider.createToken(user(1L, UserRole.USER)))).isEmpty();
    }

    @Test
    @DisplayName("형식이 틀린 토큰·빈 값은 거부")
    void malformed() {
        JwtTokenProvider provider = new JwtTokenProvider(SECRET, 60_000);
        assertThat(provider.parse("abc.def.ghi")).isEmpty();
        assertThat(provider.parse("")).isEmpty();
        assertThat(provider.parse(null)).isEmpty();
    }

    @Test
    @DisplayName("비밀키가 없거나 짧으면 서버를 시작하지 않음")
    void secretRequired() {
        assertThatThrownBy(() -> new JwtTokenProvider("", 60_000)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtTokenProvider("short", 60_000)).isInstanceOf(IllegalStateException.class);
    }
}
