package com.thatsmine.controller;

import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.auth.UpdateMeRequest;
import com.thatsmine.dto.auth.UserDTO;
import com.thatsmine.dto.lost.LostReportSummaryDTO;
import com.thatsmine.dto.me.MyFoundItemDTO;
import com.thatsmine.dto.me.MyFoundItemDetailDTO;
import com.thatsmine.dto.me.MyReturnRequestDTO;
import com.thatsmine.security.AuthUser;
import com.thatsmine.service.AuthService;
import com.thatsmine.service.FoundItemService;
import com.thatsmine.service.LostReportService;
import com.thatsmine.service.MyPageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 내 정보와 마이페이지 목록 (로그인 필요, 항상 토큰의 사용자 기준) */
@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;
    private final FoundItemService foundItemService;
    private final LostReportService lostReportService;
    private final MyPageService myPageService;

    @GetMapping
    public ResponseEntity<ApiResponse<UserDTO>> getMe(@AuthenticationPrincipal AuthUser authUser) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", authService.getMe(authUser)));
    }

    @PatchMapping
    public ResponseEntity<ApiResponse<UserDTO>> updateMe(@AuthenticationPrincipal AuthUser authUser,
                                                         @Valid @RequestBody UpdateMeRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "회원 정보가 수정되었습니다.",
                authService.updateMe(authUser, request)));
    }

    @GetMapping("/found-items")
    public ResponseEntity<ApiResponse<PageResponse<MyFoundItemDTO>>> myFoundItems(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                foundItemService.getMyFoundItems(userId, page, size)));
    }

    /** 수정 화면용(비공개 특징 포함, 본인만) */
    @GetMapping("/found-items/{id:\\d+}")
    public ResponseEntity<ApiResponse<MyFoundItemDetailDTO>> myFoundItem(@PathVariable Long id,
                                                                         @AuthenticationPrincipal AuthUser authUser) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", foundItemService.getMyFoundItem(id, userId)));
    }

    @GetMapping("/lost-reports")
    public ResponseEntity<ApiResponse<PageResponse<LostReportSummaryDTO>>> myLostReports(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                lostReportService.getMyLostReports(userId, page, size)));
    }

    @GetMapping("/return-requests")
    public ResponseEntity<ApiResponse<PageResponse<MyReturnRequestDTO>>> myReturnRequests(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                myPageService.getMyReturnRequests(userId, page, size)));
    }
}
