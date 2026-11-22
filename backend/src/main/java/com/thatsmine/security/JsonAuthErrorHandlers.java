package com.thatsmine.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** 인증·권한 오류를 공통 응답 형식(JSON, 한국어)으로 돌려준다. */
@Component
@RequiredArgsConstructor
public class JsonAuthErrorHandlers {

    private final ObjectMapper objectMapper;

    /** 로그인하지 않았거나 토큰이 만료·위조된 경우 401 */
    public AuthenticationEntryPoint entryPoint() {
        return (request, response, ex) -> write(response, HttpStatus.UNAUTHORIZED,
                ApiResponse.error("UNAUTHORIZED", "로그인이 필요합니다. 다시 로그인해 주세요."));
    }

    /** 로그인했지만 권한이 없는 경우 403 */
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> write(response, HttpStatus.FORBIDDEN,
                ApiResponse.error("FORBIDDEN", "이 기능을 사용할 권한이 없습니다."));
    }

    private void write(HttpServletResponse response, HttpStatus status, ApiResponse<Void> body) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getWriter(), body);
    }
}
