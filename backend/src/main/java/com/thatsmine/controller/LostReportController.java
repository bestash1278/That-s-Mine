package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.lost.LostReportDTO;
import com.thatsmine.dto.lost.LostReportRequest;
import com.thatsmine.dto.lost.LostReportStatusRequest;
import com.thatsmine.dto.lost.LostReportSummaryDTO;
import com.thatsmine.security.AuthUser;
import com.thatsmine.service.AuthService;
import com.thatsmine.dto.lost.MatchedItemDTO;
import com.thatsmine.service.LostReportService;
import com.thatsmine.service.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 분실 신고 API (SPEC §20)
 * - 조회(목록·상세·지도)는 비회원도 가능. 신고자 정보는 응답에 없다
 * - 등록·수정·상태 변경·삭제는 로그인 필요, 수정·삭제는 본인만
 * - GET /lost-reports/{id}/matches(유사 습득물 추천)는 로그인한 신고자 본인(또는 관리자)만
 */
@RestController
@RequestMapping("/api/v1/lost-reports")
@RequiredArgsConstructor
public class LostReportController {

    private final LostReportService lostReportService;
    private final MatchService matchService;
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LostReportSummaryDTO>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                lostReportService.search(keyword, categoryId, status, startDate, endDate, page, size)));
    }

    @GetMapping("/map")
    public ResponseEntity<ApiResponse<List<LostReportSummaryDTO>>> map(
            @RequestParam BigDecimal minLat,
            @RequestParam BigDecimal maxLat,
            @RequestParam BigDecimal minLng,
            @RequestParam BigDecimal maxLng,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "지도 조회 완료",
                lostReportService.getMapReports(minLat, maxLat, minLng, maxLng, keyword, categoryId, startDate, endDate)));
    }

    /** 유사 습득물 추천(점수 높은 순, 최대 10건). 소유 여부를 확정하는 결과가 아니다. */
    @GetMapping("/{id:\\d+}/matches")
    public ResponseEntity<ApiResponse<List<MatchedItemDTO>>> matches(@PathVariable Long id,
                                                                     @AuthenticationPrincipal AuthUser authUser) {
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "유사 습득물 조회 완료",
                matchService.getMatches(id, userId, authUser.isAdmin())));
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<LostReportDTO>> detail(@PathVariable Long id,
                                                             @AuthenticationPrincipal AuthUser authUser) {
        Long viewerId = authUser != null ? authUser.userId() : null;
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", lostReportService.getDetail(id, viewerId)));
    }

    /**
     * 분실 신고 등록. multipart/form-data
     * - request: LostReportRequest JSON
     * - images: 사진 0~3장 (JPG/PNG/WebP, 장당 5MB)
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<LostReportDTO>> create(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestPart("request") String request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) throws IOException {
        LostReportRequest body = objectMapper.readValue(request, LostReportRequest.class);
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("SUCCESS", "분실 신고가 접수되었습니다.", lostReportService.create(body, images, userId)));
    }

    /** 내용 수정(본인, '찾는 중'일 때만). 형식은 등록과 같고 keepImageUrls로 남길 사진을 지정한다. */
    @PatchMapping(value = "/{id:\\d+}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<LostReportDTO>> update(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser,
            @RequestPart("request") String request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) throws IOException {
        LostReportRequest body = objectMapper.readValue(request, LostReportRequest.class);
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "분실 신고를 수정했습니다.",
                lostReportService.update(id, userId, body, images)));
    }

    /** 상태 변경: 찾는 중 / 찾기 완료 / 신고 종료 (본인) */
    @PatchMapping("/{id:\\d+}/status")
    public ResponseEntity<ApiResponse<LostReportDTO>> changeStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser,
            @Valid @RequestBody LostReportStatusRequest request) {
        Long userId = authService.requireUser(authUser).getUserId();
        LostReportDTO dto = lostReportService.changeStatus(id, userId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "'" + dto.getStatusLabel() + "' 상태로 바꿨습니다.", dto));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, @AuthenticationPrincipal AuthUser authUser) {
        Long userId = authService.requireUser(authUser).getUserId();
        lostReportService.delete(id, userId);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "분실 신고를 삭제했습니다.", null));
    }
}
