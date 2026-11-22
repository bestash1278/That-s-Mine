package com.thatsmine.config;

import com.thatsmine.security.JsonAuthErrorHandlers;
import com.thatsmine.security.JwtAuthenticationFilter;
import com.thatsmine.security.JwtTokenProvider;
import com.thatsmine.security.TokenRevocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * 권한 규칙 (SPEC §13, §16, §23)
 * - 비회원: 습득물·분실 신고 조회·상세·지도, 기준 데이터 조회, 회원가입·로그인
 * - 로그인 사용자: 습득물 신고, 분실 신고, 반환 신청, 내 정보
 * - ADMIN: /api/v1/admin/**, /api/v1/dev/** (관리자 여부는 서버가 JWT의 role로 판단)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final JsonAuthErrorHandlers jsonAuthErrorHandlers;
    private final TokenRevocationService tokenRevocationService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // 쿠키 세션이 아닌 Authorization 헤더 방식이라 CSRF 토큰이 필요 없다
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(jsonAuthErrorHandlers.entryPoint())
                        .accessDeniedHandler(jsonAuthErrorHandlers.accessDeniedHandler()))
                .authorizeHttpRequests(auth -> auth
                        // 인증
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login", "/api/v1/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/check-email").permitAll()
                        // 비회원도 조회 가능
                        .requestMatchers(HttpMethod.GET, "/api/v1/found-items", "/api/v1/found-items/*",
                                "/api/v1/found-items/map", "/api/v1/found-items/recent").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/lost-reports", "/api/v1/lost-reports/*",
                                "/api/v1/lost-reports/map").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/categories", "/api/v1/campus-buildings",
                                "/api/v1/storage-locations").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        // 화면(index.html·정적 파일·새로 고침한 화면 경로)은 /api가 아닌 모든 GET. 로그인 여부는 화면이 아니라 API가 판단한다.
                        .requestMatchers(request -> HttpMethod.GET.matches(request.getMethod())
                                && !request.getRequestURI().startsWith("/api/")).permitAll()
                        .requestMatchers("/error").permitAll()
                        // 관리자
                        .requestMatchers("/api/v1/admin/**", "/api/v1/dev/**").hasRole("ADMIN")
                        // 그 밖의 API(신고, 반환 신청, 내 정보 등)는 로그인 필요
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, tokenRevocationService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
