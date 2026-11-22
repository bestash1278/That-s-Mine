package com.thatsmine.controller;

import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.auth.AuthResponse;
import com.thatsmine.dto.auth.LoginRequest;
import com.thatsmine.dto.auth.SignupRequest;
import com.thatsmine.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
     * JWT는 서버에 세션을 두지 않으므로 클라이언트가 토큰을 지우면 로그아웃된다.
     * 이 API는 프론트의 로그아웃 흐름을 통일하기 위한 것이다.
     * (토큰 강제 만료가 필요하면 차단 목록을 두는 방식으로 확장한다)
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "로그아웃되었습니다.", null));
    }

    /** 회원가입 화면의 이메일 중복 확인 */
    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkEmail(@RequestParam String email) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "확인 완료",
                Map.of("available", authService.isEmailAvailable(email))));
    }
}
