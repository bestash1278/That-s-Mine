package com.thatsmine.service;

import com.thatsmine.dto.auth.AuthResponse;
import com.thatsmine.dto.auth.LoginRequest;
import com.thatsmine.dto.auth.SignupRequest;
import com.thatsmine.dto.auth.UpdateMeRequest;
import com.thatsmine.dto.auth.UserDTO;
import com.thatsmine.entity.User;
import com.thatsmine.enums.UserRole;
import com.thatsmine.exception.FieldValidationException;
import com.thatsmine.exception.UnauthorizedException;
import com.thatsmine.repository.UserRepository;
import com.thatsmine.security.AuthUser;
import com.thatsmine.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String LOGIN_FAILED = "이메일 또는 비밀번호가 올바르지 않습니다.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /** 회원가입 후 바로 로그인 상태로 토큰을 돌려준다. */
    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.getEmail());
        Map<String, String> errors = new LinkedHashMap<>();
        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            errors.put("passwordConfirm", "비밀번호가 서로 다릅니다.");
        }
        if (userRepository.existsByEmail(email)) {
            errors.put("email", "이미 사용 중인 이메일입니다.");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        User user;
        try {
            user = userRepository.saveAndFlush(User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .nickname(request.getNickname().trim())
                    .role(UserRole.USER) // 회원가입으로는 관리자가 될 수 없다
                    .build());
        } catch (DataIntegrityViolationException e) {
            // 동시에 같은 이메일로 가입한 경우
            throw new FieldValidationException(Map.of("email", "이미 사용 중인 이메일입니다."));
        }
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.getEmail())).orElse(null);
        // 이메일이 있는지 없는지 알 수 없도록 같은 메시지를 쓴다
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException(LOGIN_FAILED);
        }
        return toAuthResponse(user);
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return email != null && !email.isBlank() && !userRepository.existsByEmail(normalizeEmail(email));
    }

    @Transactional(readOnly = true)
    public UserDTO getMe(AuthUser authUser) {
        return UserDTO.from(requireUser(authUser));
    }

    @Transactional
    public UserDTO updateMe(AuthUser authUser, UpdateMeRequest request) {
        User user = requireUser(authUser);
        Map<String, String> errors = new LinkedHashMap<>();

        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            if (request.getCurrentPassword() == null
                    || !passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
                errors.put("currentPassword", "현재 비밀번호가 올바르지 않습니다.");
            }
        }
        String nickname = request.getNickname() == null ? null : request.getNickname().trim();
        if (nickname != null && nickname.length() < 2) {
            errors.put("nickname", "닉네임은 2자 이상 20자 이하로 입력해 주세요.");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        if (nickname != null) {
            user.changeNickname(nickname);
        }
        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            user.changePasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }
        return UserDTO.from(user);
    }

    /**
     * 토큰의 사용자가 실제로 있는지 확인한다.
     * (시연 데이터 초기화 등으로 사용자가 사라졌으면 401 → 프론트가 다시 로그인하게 한다)
     */
    @Transactional(readOnly = true)
    public User requireUser(AuthUser authUser) {
        if (authUser == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return userRepository.findById(authUser.userId())
                .orElseThrow(() -> new UnauthorizedException("로그인 정보가 만료되었습니다. 다시 로그인해 주세요."));
    }

    private AuthResponse toAuthResponse(User user) {
        return AuthResponse.builder()
                .accessToken(jwtTokenProvider.createToken(user))
                .expiresIn(jwtTokenProvider.getExpirationSeconds())
                .user(UserDTO.from(user))
                .build();
    }

    static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
