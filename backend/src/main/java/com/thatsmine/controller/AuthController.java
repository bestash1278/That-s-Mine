package com.thatsmine.controller;

import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.auth.AuthResponse;
import com.thatsmine.dto.auth.LoginRequest;
import com.thatsmine.dto.auth.SignupRequest;
import com.thatsmine.security.JwtTokenProvider;
import com.thatsmine.security.TokenRevocationService;
import com.thatsmine.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** SPEC §20 인증 API */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;
    private final TokenRevocationService tokenRevocationService;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("SUCCESS", "회원가입이 완료되었습니다.", authService.signup(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "로그인되었습니다.", authService.login(request)));
    }

    /**
     * 로그아웃. 클라이언트가 토큰을 지우는 것과 함께, 서버가 그 토큰의 고유 번호(jti)를 차단 목록에 올려
     * 만료 전에도 다시 쓰지 못하게 한다. 같은 계정의 다른 기기 로그인은 그대로다.
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        // 토큰이 유효하면 서버가 무효화한다. 이미 만료·위조된 토큰이거나 토큰이 없어도 로그아웃은 성공으로 본다.
        if (authorization != null && authorization.startsWith("Bearer ")) {
            jwtTokenProvider.parseToken(authorization.substring(7).trim())
                    .ifPresent(parsed -> tokenRevocationService.revoke(parsed.jti(), parsed.expiresAt()));
        }
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "로그아웃되었습니다.", null));
    }

    /** 회원가입 화면의 이메일 중복 확인 */
    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkEmail(@RequestParam String email) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "확인 완료",
                Map.of("available", authService.isEmailAvailable(email))));
    }
}
