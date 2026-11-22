package com.thatsmine.security;

import com.thatsmine.entity.User;
import com.thatsmine.enums.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

/**
 * JWT 발급·검증 (HS256).
 * 비밀키는 환경변수 JWT_SECRET으로 받고, 32바이트(256비트) 미만이거나 비어 있으면 서버를 시작하지 않는다.
 */
@Component
public class JwtTokenProvider {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_ROLE = "role";

    private final SecretKey key;
    private final long expirationMillis;

    public JwtTokenProvider(@Value("${jwt.secret:}") String secret,
                            @Value("${jwt.expiration:86400000}") long expirationMillis) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "JWT 비밀키가 설정되지 않았습니다. 환경변수 JWT_SECRET에 32자 이상의 임의 문자열을 넣어 주세요. " +
                    "(개발용 실행은 --spring.profiles.active=dev)");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT 비밀키가 너무 짧습니다. 32바이트 이상으로 설정해 주세요.");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMillis = expirationMillis;
    }

    public String createToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(user.getUserId()))
                .claim(CLAIM_EMAIL, user.getEmail())
                .claim(CLAIM_ROLE, user.getRole().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMillis))
                .signWith(key)
                .compact();
    }

    /** 서명·만료를 검증하고 사용자 정보를 돌려준다. 잘못된 토큰이면 빈 값. */
    public Optional<AuthUser> parse(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Long userId = Long.valueOf(claims.getSubject());
            String email = claims.get(CLAIM_EMAIL, String.class);
            UserRole role = UserRole.valueOf(claims.get(CLAIM_ROLE, String.class));
            return Optional.of(new AuthUser(userId, email, role));
        } catch (JwtException | IllegalArgumentException e) {
            // 만료·위조·형식 오류 → 비로그인으로 처리
            return Optional.empty();
        }
    }

    public long getExpirationSeconds() {
        return expirationMillis / 1000;
    }
}
