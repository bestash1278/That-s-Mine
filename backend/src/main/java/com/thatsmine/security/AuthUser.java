package com.thatsmine.security;

import com.thatsmine.enums.UserRole;

/**
 * JWT에서 꺼낸 로그인 사용자 정보. 컨트롤러에서 {@code @AuthenticationPrincipal AuthUser}로 받는다.
 * 권한 판단은 항상 서버에서 이 값(role)으로 한다. 프론트 표시 여부는 믿지 않는다.
 */
public record AuthUser(Long userId, String email, UserRole role) {
    public boolean isAdmin() {
        return role == UserRole.ADMIN;
    }
}
