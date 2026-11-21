package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.*;
import com.thatsmine.service.FoundItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FoundItemListItemDTO>>> searchFoundItems(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "NEWEST") String sort,
            @PageableDefault(size = 20, page = 0, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        PageResponse<FoundItemListItemDTO> response = foundItemService.searchFoundItems(
                keyword, categoryId, buildingId, status, startDate, endDate, sort, pageable);

        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "검색 완료", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PublicFoundItemDTO>> getFoundItem(@PathVariable Long id) {
        PublicFoundItemDTO response = foundItemService.getFoundItemDetail(id);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", response));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<PageResponse<FoundItemListItemDTO>>> getRecentFoundItems(
            @RequestParam(defaultValue = "10") int limit,
            @PageableDefault(size = 10, page = 0, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        PageResponse<FoundItemListItemDTO> response = foundItemService.getRecentFoundItems(limit, pageable);
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

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PublicFoundItemDTO>> createFoundItem(
            @RequestPart String request,
            @RequestPart(required = false) List<MultipartFile> images) throws IOException {

        CreateFoundItemRequest createRequest = objectMapper.readValue(request, CreateFoundItemRequest.class);

        // TODO: 인증 추가 후 실제 사용자 ID 사용
        Long reporterId = 1L;

        PublicFoundItemDTO response = foundItemService.createFoundItem(createRequest, images, reporterId);
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "습득물 신고 완료", response));
    }
}
