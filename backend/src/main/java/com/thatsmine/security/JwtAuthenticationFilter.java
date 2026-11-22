package com.thatsmine.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authorization: Bearer {token} 헤더를 검증해 로그인 사용자를 설정한다.
 * 토큰이 없거나 잘못되면 아무것도 하지 않는다(로그인이 필요한 API는 SecurityConfig에서 401).
 *
 * 빈(@Component)으로 등록하지 않는다. 빈으로 등록하면 Spring Boot가 일반 서블릿 필터로도 등록해
 * 보안 필터 체인보다 먼저 한 번 실행되고, 체인 안에서는 '이미 실행됨'으로 건너뛰어 인증이 사라질 수 있다.
 * SecurityConfig에서 직접 만들어 체인에만 넣는다.
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenRevocationService tokenRevocationService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            // 로그아웃한 토큰은 만료 전이어도 인증하지 않는다
            jwtTokenProvider.parseToken(header.substring(BEARER.length()).trim())
                    .filter(parsed -> !tokenRevocationService.isRevoked(parsed.jti()))
                    .map(JwtTokenProvider.ParsedToken::user)
                    .ifPresent(user -> {
                var authentication = new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }
        chain.doFilter(request, response);
    }
}
