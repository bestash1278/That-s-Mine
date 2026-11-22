-- 12단계 이후: 로그아웃한 JWT를 서버가 기억해 만료 전에도 다시 쓰지 못하게 한다(SPEC §13).
-- jti는 토큰마다 고유한 번호이고, 토큰이 원래 만료되는 시각(expires_at)이 지나면 지워도 된다.
CREATE TABLE revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens(expires_at);
