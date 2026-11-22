package com.thatsmine.controller;

import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.me.MyReturnRequestDTO;
import com.thatsmine.dto.returns.CreateReturnRequestRequest;
import com.thatsmine.dto.returns.ReturnEligibilityDTO;
import com.thatsmine.security.AuthUser;
import com.thatsmine.service.AuthService;
import com.thatsmine.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 반환 신청(SPEC §15, §20). 로그인한 사용자만 쓸 수 있고, 항상 토큰의 사용자 기준으로 동작한다. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReturnRequestController {

    private final ReturnRequestService returnRequestService;
    private final AuthService authService;

    /** 이 물품에 지금 신청할 수 있는지, 못 하면 이유, 내 최근 신청 */
    @GetMapping("/found-items/{id:\\d+}/return-requests/me")
    public ResponseEntity<ApiResponse<ReturnEligibilityDTO>> eligibility(@PathVariable Long id,
                                                                         @AuthenticationPrincipal AuthUser authUser) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", returnRequestService.getEligibility(id, userId)));
    }

    @PostMapping("/found-items/{id:\\d+}/return-requests")
    public ResponseEntity<ApiResponse<MyReturnRequestDTO>> create(@PathVariable Long id,
                                                                  @AuthenticationPrincipal AuthUser authUser,
                                                                  @RequestBody CreateReturnRequestRequest request) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("CREATED",
                "반환 신청이 접수되었습니다. 담당자가 소유 여부를 확인합니다.", returnRequestService.create(id, userId, request)));
    }

    @PatchMapping("/return-requests/{id:\\d+}/cancel")
    public ResponseEntity<ApiResponse<MyReturnRequestDTO>> cancel(@PathVariable Long id,
                                                                  @AuthenticationPrincipal AuthUser authUser) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "반환 신청을 취소했습니다.", returnRequestService.cancel(id, userId)));
    }
}
