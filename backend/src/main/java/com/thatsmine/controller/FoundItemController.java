package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.*;
import com.thatsmine.dto.me.MyFoundItemDetailDTO;
import com.thatsmine.security.AuthUser;
import com.thatsmine.service.AuthService;
import com.thatsmine.service.FoundItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/found-items")
@RequiredArgsConstructor
public class FoundItemController {
    private final FoundItemService foundItemService;
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    /**
     * 습득물 목록 검색. page는 0부터 시작한다.
     * sort: NEWEST(기본) | OLDEST | LATEST_FOUND | OLDEST_FOUND
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FoundItemListItemDTO>>> searchFoundItems(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "NEWEST") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageResponse<FoundItemListItemDTO> response = foundItemService.searchFoundItems(
                keyword, categoryId, buildingId, status, startDate, endDate, sort, page, size);

        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "검색 완료", response));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<PageResponse<FoundItemListItemDTO>>> getRecentFoundItems(
            @RequestParam(defaultValue = "8") int limit) {
        PageResponse<FoundItemListItemDTO> response = foundItemService.getRecentFoundItems(limit);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "최신 습득물 조회 완료", response));
    }

    @GetMapping("/map")
    public ResponseEntity<ApiResponse<List<PublicFoundItemDTO>>> getMapItems(
            @RequestParam BigDecimal minLat,
            @RequestParam BigDecimal maxLat,
            @RequestParam BigDecimal minLng,
            @RequestParam BigDecimal maxLng,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<PublicFoundItemDTO> response = foundItemService.getMapItems(
                minLat, maxLat, minLng, maxLng,
                keyword, categoryId, status, startDate, endDate);

        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "지도 조회 완료", response));
    }

    // "/recent", "/map"보다 뒤에 와도 숫자만 받으므로 충돌하지 않는다.
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<PublicFoundItemDTO>> getFoundItem(@PathVariable Long id) {
        PublicFoundItemDTO response = foundItemService.getFoundItemDetail(id);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", response));
    }

    /**
     * 습득물 신고 (로그인 필요). multipart/form-data
     * - request: CreateFoundItemRequest JSON 문자열
     * - images: 사진 0~3장 (JPG/PNG/WebP, 장당 5MB)
     * 검증 실패 시 400 { code: VALIDATION_ERROR, fieldErrors: { 필드: 메시지 } }
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PublicFoundItemDTO>> createFoundItem(
            @AuthenticationPrincipal AuthUser authUser,
            @RequestPart("request") String request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) throws IOException {

        CreateFoundItemRequest createRequest = objectMapper.readValue(request, CreateFoundItemRequest.class);

        // 신고자는 항상 로그인한 사용자. 요청 본문의 값은 쓰지 않는다.
        Long reporterId = authService.requireUser(authUser).getUserId();

        PublicFoundItemDTO response = foundItemService.createFoundItem(createRequest, images, reporterId);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "습득물 신고가 등록되었습니다.", response));
    }

    /**
     * 신고자 본인의 습득물 수정. multipart/form-data
     * - request: UpdateFoundItemRequest JSON (keepImageUrls로 남길 기존 사진 지정)
     * - images: 새로 추가할 사진
     * 반환 진행 중·완료, 처리 중인 반환 신청이 있으면 409
     */
    @PatchMapping(value = "/{id:\\d+}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MyFoundItemDetailDTO>> updateFoundItem(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthUser authUser,
            @RequestPart("request") String request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) throws IOException {
        UpdateFoundItemRequest body = objectMapper.readValue(request, UpdateFoundItemRequest.class);
        Long userId = authService.requireUser(authUser).getUserId();
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "습득물 정보를 수정했습니다.",
                foundItemService.updateFoundItem(id, userId, body, images)));
    }

    /** 신고자 본인의 습득물 삭제(Soft Delete). 수정과 같은 제한 */
    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<Void>> deleteFoundItem(@PathVariable Long id,
                                                             @AuthenticationPrincipal AuthUser authUser) {
        Long userId = authService.requireUser(authUser).getUserId();
        foundItemService.deleteFoundItem(id, userId);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "습득물 신고를 삭제했습니다.", null));
    }
}
