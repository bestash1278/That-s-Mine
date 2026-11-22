package com.thatsmine.security;

import com.thatsmine.entity.RevokedToken;
import com.thatsmine.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 로그아웃한 토큰을 서버가 기억해, 토큰이 아직 만료되지 않았어도 다시 쓰지 못하게 한다(SPEC §13 로그아웃).
 * 토큰마다 고유한 jti를 DB에 남기므로 서버를 다시 시작해도 유지되고, 같은 계정의 다른 기기 로그인은 그대로다.
 */
@Service
@RequiredArgsConstructor
public class TokenRevocationService {

    private final RevokedTokenRepository revokedTokenRepository;

    @Transactional(readOnly = true)
    public boolean isRevoked(String jti) {
        return jti != null && revokedTokenRepository.existsById(jti);
    }

    /** 토큰을 무효화하고, 이미 만료된 기록은 함께 정리한다. 같은 토큰을 두 번 로그아웃해도 문제없다. */
    @Transactional
    public void revoke(String jti, Instant expiresAt) {
        if (jti == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        revokedTokenRepository.deleteExpired(now);
        if (!revokedTokenRepository.existsById(jti)) {
            revokedTokenRepository.save(RevokedToken.builder()
                    .jti(jti)
                    .expiresAt(LocalDateTime.ofInstant(expiresAt, ZoneId.systemDefault()))
                    .revokedAt(now)
                    .build());
        }
    }
}
