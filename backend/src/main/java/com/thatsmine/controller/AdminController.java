package com.thatsmine.controller;

import com.thatsmine.dto.AdminFoundItemDTO;
import com.thatsmine.dto.ApiResponse;
import com.thatsmine.dto.CampusBuildingDTO;
import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.admin.AdminFoundLocationRequest;
import com.thatsmine.dto.admin.AdminStorageLocationDTO;
import com.thatsmine.dto.admin.AdminStorageRequest;
import com.thatsmine.dto.admin.BuildingRequest;
import com.thatsmine.dto.admin.ChangeItemStatusRequest;
import com.thatsmine.dto.admin.StorageLocationRequest;
import com.thatsmine.dto.lost.LostReportSummaryDTO;
import com.thatsmine.dto.returns.AdminReturnRequestDTO;
import com.thatsmine.dto.returns.ReviewReturnRequestRequest;
import com.thatsmine.service.AdminService;
import com.thatsmine.service.LostReportService;
import com.thatsmine.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 관리자 API (SPEC §16, §20). SecurityConfig가 /api/v1/admin/** 를 ROLE_ADMIN으로 막고,
 * {@code @PreAuthorize}로 한 번 더 확인한다(경로 설정이 바뀌어도 열리지 않게).
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ReturnRequestService returnRequestService;
    private final LostReportService lostReportService;

    // ---- 습득물

    @GetMapping("/found-items")
    public ResponseEntity<ApiResponse<PageResponse<AdminFoundItemDTO>>> foundItems(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                adminService.searchFoundItems(keyword, status, categoryId, page, size)));
    }

    @PatchMapping("/found-items/{id:\\d+}/status")
    public ResponseEntity<ApiResponse<AdminFoundItemDTO>> changeStatus(@PathVariable Long id,
                                                                       @RequestBody ChangeItemStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "처리 상태를 바꿨습니다.", adminService.changeStatus(id, request)));
    }

    @PatchMapping("/found-items/{id:\\d+}/storage")
    public ResponseEntity<ApiResponse<AdminFoundItemDTO>> updateStorage(@PathVariable Long id,
                                                                        @RequestBody AdminStorageRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "보관 위치를 지정했습니다.", adminService.updateStorage(id, request)));
    }

    @PatchMapping("/found-items/{id:\\d+}/found-location")
    public ResponseEntity<ApiResponse<AdminFoundItemDTO>> updateFoundLocation(@PathVariable Long id,
                                                                              @RequestBody AdminFoundLocationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "발견 위치를 수정했습니다.", adminService.updateFoundLocation(id, request)));
    }

    // ---- 분실 신고

    @GetMapping("/lost-reports")
    public ResponseEntity<ApiResponse<PageResponse<LostReportSummaryDTO>>> lostReports(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                lostReportService.getAdminReports(keyword, status, page, size)));
    }

    // ---- 반환 신청

    @GetMapping("/return-requests")
    public ResponseEntity<ApiResponse<PageResponse<AdminReturnRequestDTO>>> returnRequests(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료",
                returnRequestService.searchForAdmin(status, page, size)));
    }

    @PatchMapping("/return-requests/{id:\\d+}/status")
    public ResponseEntity<ApiResponse<AdminReturnRequestDTO>> reviewReturnRequest(
            @PathVariable Long id, @RequestBody ReviewReturnRequestRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "반환 신청을 처리했습니다.", returnRequestService.review(id, request)));
    }

    // ---- 교내 건물

    @PostMapping("/campus-buildings")
    public ResponseEntity<ApiResponse<CampusBuildingDTO>> createBuilding(@RequestBody BuildingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("CREATED", "건물을 등록했습니다.",
                adminService.createBuilding(request)));
    }

    @PatchMapping("/campus-buildings/{id:\\d+}")
    public ResponseEntity<ApiResponse<CampusBuildingDTO>> updateBuilding(@PathVariable Long id,
                                                                         @RequestBody BuildingRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "건물 정보를 수정했습니다.", adminService.updateBuilding(id, request)));
    }

    // ---- 공식 보관 장소

    @GetMapping("/storage-locations")
    public ResponseEntity<ApiResponse<List<AdminStorageLocationDTO>>> storageLocations() {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "조회 완료", adminService.listStorageLocations()));
    }

    @PostMapping("/storage-locations")
    public ResponseEntity<ApiResponse<AdminStorageLocationDTO>> createStorageLocation(@RequestBody StorageLocationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("CREATED", "보관 장소를 등록했습니다.",
                adminService.createStorageLocation(request)));
    }

    @PatchMapping("/storage-locations/{id:\\d+}")
    public ResponseEntity<ApiResponse<AdminStorageLocationDTO>> updateStorageLocation(@PathVariable Long id,
                                                                                      @RequestBody StorageLocationRequest request) {
        return ResponseEntity.ok(ApiResponse.success("SUCCESS", "보관 장소를 수정했습니다.", adminService.updateStorageLocation(id, request)));
    }
}
