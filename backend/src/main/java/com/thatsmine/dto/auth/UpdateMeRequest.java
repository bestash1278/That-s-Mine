package com.thatsmine.dto.auth;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 내 정보 수정. 바꿀 항목만 보낸다.
 * 비밀번호를 바꾸려면 currentPassword와 newPassword를 함께 보낸다.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateMeRequest {
    @Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하로 입력해 주세요.")
    private String nickname;

    private String currentPassword;

    @Size(min = 8, max = 64, message = "비밀번호는 8자 이상 64자 이하로 입력해 주세요.")
    @Pattern(regexp = PasswordRules.PATTERN, message = PasswordRules.MESSAGE)
    private String newPassword;
}
