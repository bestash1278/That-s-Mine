package com.thatsmine.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.entity.User;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.UserRepository;
import com.thatsmine.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 8단계: 회원가입·로그인·권한 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("인증·권한")
class AuthApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private Map<String, String> signupBody(String email) {
        return Map.of("email", email, "password", "abcd1234", "passwordConfirm", "abcd1234", "nickname", "새내기");
    }

    private User saveUser(String email, UserRole role) {
        return userRepository.save(User.builder()
                .email(email).passwordHash(passwordEncoder.encode("abcd1234")).nickname("사용자").role(role).build());
    }

    // ---------------------------------------------------------------- 회원가입

    @Test
    @DisplayName("회원가입하면 바로 로그인 토큰을 받고, 역할은 항상 USER")
    void signup() throws Exception {
        String body = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", " New@Test.Local ", "password", "abcd1234",
                                "passwordConfirm", "abcd1234", "nickname", "새내기", "role", "ADMIN"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("new@test.local"))
                .andExpect(jsonPath("$.data.user.role").value("USER"))
                .andExpect(jsonPath("$.data.user.passwordHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        JsonNode node = objectMapper.readTree(body);
        assertThat(userRepository.findByEmail("new@test.local")).get()
                .satisfies(u -> assertThat(u.getPasswordHash()).startsWith("$2")); // BCrypt
        assertThat(node.at("/data/expiresIn").asLong()).isPositive();
    }

    @Test
    @DisplayName("이미 있는 이메일은 거부(대소문자 무시)")
    void duplicateEmail() throws Exception {
        saveUser("dup@test.local", UserRole.USER);
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(signupBody("DUP@test.local"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").value("이미 사용 중인 이메일입니다."));
    }

    @Test
    @DisplayName("비밀번호 규칙·확인 불일치·이메일 형식 검증")
    void signupValidation() throws Exception {
        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "not-an-email", "password", "abcdefgh",
                                "passwordConfirm", "x", "nickname", "a"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists())
                .andExpect(jsonPath("$.fieldErrors.nickname").exists());

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "ok@test.local", "password", "abcd1234",
                                "passwordConfirm", "abcd9999", "nickname", "새내기"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.passwordConfirm").exists());
    }

    @Test
    @DisplayName("이메일 중복 확인 API")
    void checkEmail() throws Exception {
        saveUser("taken@test.local", UserRole.USER);
        mockMvc.perform(get("/api/v1/auth/check-email").param("email", "taken@test.local"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(false));
        mockMvc.perform(get("/api/v1/auth/check-email").param("email", "free@test.local"))
                .andExpect(jsonPath("$.data.available").value(true));
    }

    // ---------------------------------------------------------------- 로그인

    @Test
    @DisplayName("로그인 성공 / 비밀번호 틀림은 401과 같은 메시지")
    void login() throws Exception {
        saveUser("login@test.local", UserRole.USER);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "login@test.local", "password", "abcd1234"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "login@test.local", "password", "wrong1234"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 올바르지 않습니다."));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "nobody@test.local", "password", "abcd1234"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("이메일 또는 비밀번호가 올바르지 않습니다."));
    }

    // ---------------------------------------------------------------- 내 정보

    @Test
    @DisplayName("내 정보: 토큰 없으면 401 JSON, 있으면 조회")
    void me() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer not.a.token"))
                .andExpect(status().isUnauthorized());

        User user = saveUser("me@test.local", UserRole.USER);
        mockMvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + jwtTokenProvider.createToken(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("me@test.local"));
    }

    @Test
    @DisplayName("내 정보 수정: 닉네임, 비밀번호는 현재 비밀번호가 맞아야 변경")
    void updateMe() throws Exception {
        User user = saveUser("edit@test.local", UserRole.USER);
        String bearer = "Bearer " + jwtTokenProvider.createToken(user);

        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("nickname", "바뀐이름"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("바뀐이름"));

        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("currentPassword", "wrong1234", "newPassword", "newpass123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.currentPassword").exists());

        mockMvc.perform(patch("/api/v1/users/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("currentPassword", "abcd1234", "newPassword", "newpass123"))))
                .andExpect(status().isOk());
        assertThat(passwordEncoder.matches("newpass123", userRepository.findById(user.getUserId()).orElseThrow().getPasswordHash()))
                .isTrue();
    }

    @Test
    @DisplayName("사라진 사용자의 토큰은 401 (시연 데이터 초기화 후)")
    void deletedUserToken() throws Exception {
        User user = saveUser("gone@test.local", UserRole.USER);
        String bearer = "Bearer " + jwtTokenProvider.createToken(user);
        userRepository.delete(user);
        userRepository.flush();

        mockMvc.perform(get("/api/v1/users/me").header("Authorization", bearer))
                .andExpect(status().isUnauthorized());
    }

    // ---------------------------------------------------------------- 권한

    @Test
    @DisplayName("비회원은 조회 가능, 신고는 401")
    void guestAccess() throws Exception {
        mockMvc.perform(get("/api/v1/found-items")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/categories")).andExpect(status().isOk());
        mockMvc.perform(multipart("/api/v1/found-items")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("관리자 API: 비로그인 401, 일반 사용자 403")
    void adminOnly() throws Exception {
        mockMvc.perform(get("/api/v1/admin/found-items"))
                .andExpect(status().isUnauthorized());

        User user = saveUser("user@test.local", UserRole.USER);
        mockMvc.perform(get("/api/v1/admin/found-items").header("Authorization", "Bearer " + jwtTokenProvider.createToken(user)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
