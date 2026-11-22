package com.thatsmine.service;

import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.lost.LostReportDTO;
import com.thatsmine.dto.lost.LostReportRequest;
import com.thatsmine.dto.lost.LostReportSummaryDTO;
import com.thatsmine.entity.*;
import com.thatsmine.enums.LostReportStatus;
import com.thatsmine.exception.ConflictException;
import com.thatsmine.exception.FieldValidationException;
import com.thatsmine.exception.ForbiddenException;
import com.thatsmine.exception.NotFoundException;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * 분실 신고 (SPEC §11, §14)
 * - 분실 날짜 또는 추정 기간(lostDate ~ lostEndDate)
 * - 대표 추정 위치(건물 선택 또는 장소 이름) + 추가 설명. 여러 장소를 강제로 입력하게 하지 않는다
 * - 본인만 수정·삭제. 삭제는 Soft Delete
 * - 신고자 정보(이메일·닉네임)는 공개 응답에 넣지 않는다
 */
@Service
@RequiredArgsConstructor
public class LostReportService {

    private static final int MAX_PAGE_SIZE = 50;
    static final int MAX_MAP_REPORTS = 300;

    private final LostReportRepository lostReportRepository;
    private final LostReportImageRepository lostReportImageRepository;
    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final UserRepository userRepository;
    private final SearchSynonymService searchSynonymService;
    private final ImageStorageService imageStorageService;

    // ------------------------------------------------------------------ 등록

    @Transactional
    public LostReportDTO create(LostReportRequest request, List<MultipartFile> images, Long userId) {
        if (request == null) {
            throw new IllegalArgumentException("신고 내용이 비어 있습니다.");
        }
        List<MultipartFile> files = ImageStorageService.nonEmpty(images);
        Map<String, String> errors = validate(request);
        List<String> types = imageStorageService.validate(files, 0, errors);
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("신고자 정보를 찾을 수 없습니다."));
        Category category = findCategory(request.getCategoryId());
        CampusBuilding building = findBuilding(request.getLostBuildingId());

        LostReport report = lostReportRepository.save(LostReport.builder()
                .user(user)
                .category(category)
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .lostDate(request.getLostDate())
                .lostEndDate(normalizeEndDate(request.getLostDate(), request.getLostEndDate()))
                .lostBuilding(building)
                .lostLocation(resolveLocationName(request.getLostLocation(), building))
                .lostLocationDetail(trimToNull(request.getLostLocationDetail()))
                .lostLatitude(request.getLostLatitude())
                .lostLongitude(request.getLostLongitude())
                .status(LostReportStatus.SEARCHING)
                .build());

        List<String> urls = imageStorageService.store(files, types);
        Integer rep = request.getRepresentativeImageIndex();
        int thumbnail = rep != null && rep >= 0 && rep < urls.size() ? rep : 0;
        for (int i = 0; i < urls.size(); i++) {
            lostReportImageRepository.save(LostReportImage.builder()
                    .report(report).imageUrl(urls.get(i)).sortOrder(i).isThumbnail(i == thumbnail).build());
        }
        return LostReportDTO.from(report, getImageUrls(report.getReportId()), true, null);
    }

    // ------------------------------------------------------------------ 조회

    /** 상세. 로그인한 사용자가 본인이면 수정 가능 여부를 함께 준다. */
    @Transactional(readOnly = true)
    public LostReportDTO getDetail(Long reportId, Long viewerId) {
        LostReport report = findNotDeleted(reportId);
        boolean mine = viewerId != null && report.getUser().getUserId().equals(viewerId);
        String lockReason = mine ? EditPolicy.lostReportContentLockReason(report.getStatus()) : null;
        return LostReportDTO.from(report, getImageUrls(reportId), mine, lockReason);
    }

    /** 공개 목록. 상태를 지정하지 않으면 '찾는 중'만 */
    @Transactional(readOnly = true)
    public PageResponse<LostReportSummaryDTO> search(String keyword, Long categoryId, String status,
                                                     LocalDate startDate, LocalDate endDate, int page, int size) {
        String[] kw = searchSynonymService.expandToThree(keyword);
        LostReportStatus st = parseStatus(status);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostReport> result = lostReportRepository.search(kw[0], kw[1], kw[2], categoryId,
                st == null ? LostReportStatus.SEARCHING : st, startDate, endDate, pageable);
        return PageResponse.from(result.map(r -> LostReportSummaryDTO.from(r, getThumbnailUrl(r.getReportId()))));
    }

    /** 지도 영역 안의 '찾는 중' 분실 신고 (주황색 마커) */
    @Transactional(readOnly = true)
    public List<LostReportSummaryDTO> getMapReports(BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng,
                                                    String keyword, Long categoryId, LocalDate startDate, LocalDate endDate) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (minLat.compareTo(BigDecimal.valueOf(-90)) < 0 || maxLat.compareTo(BigDecimal.valueOf(90)) > 0
                || minLng.compareTo(BigDecimal.valueOf(-180)) < 0 || maxLng.compareTo(BigDecimal.valueOf(180)) > 0) {
            errors.put("bounds", "지도 영역 좌표가 올바른 범위를 벗어났습니다.");
        } else if (minLat.compareTo(maxLat) > 0 || minLng.compareTo(maxLng) > 0) {
            errors.put("bounds", "지도 영역의 최소값이 최대값보다 큽니다.");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
        String[] kw = searchSynonymService.expandToThree(keyword);
        return lostReportRepository.searchByMapBounds(minLat, maxLat, minLng, maxLng, kw[0], kw[1], kw[2],
                        categoryId, LostReportStatus.SEARCHING, startDate, endDate).stream()
                .limit(MAX_MAP_REPORTS)
                .map(r -> LostReportSummaryDTO.from(r, getThumbnailUrl(r.getReportId())))
                .toList();
    }

    /** 관리자 목록: 모든 분실 신고(모든 상태, 삭제 제외). 키워드·상태로 거를 수 있다 */
    @Transactional(readOnly = true)
    public PageResponse<LostReportSummaryDTO> getAdminReports(String keyword, String status, int page, int size) {
        String kw = keyword == null || keyword.isBlank() ? null : keyword.trim();
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostReport> result = lostReportRepository.searchForAdmin(kw, parseStatus(status), pageable);
        return PageResponse.from(result.map(r -> LostReportSummaryDTO.from(r, getThumbnailUrl(r.getReportId()))));
    }

    /** 마이페이지: 내 분실 신고 (모든 상태) */
    @Transactional(readOnly = true)
    public PageResponse<LostReportSummaryDTO> getMyLostReports(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<LostReport> result = lostReportRepository.findByUser_UserIdAndDeletedAtIsNull(userId, pageable);
        return PageResponse.from(result.map(r -> LostReportSummaryDTO.forOwner(
                r, getThumbnailUrl(r.getReportId()), EditPolicy.lostReportContentLockReason(r.getStatus()))));
    }

    // ------------------------------------------------------------------ 수정·상태 변경·삭제 (본인만)

    @Transactional
    public LostReportDTO update(Long reportId, Long userId, LostReportRequest request, List<MultipartFile> images) {
        if (request == null) {
            throw new IllegalArgumentException("수정 내용이 비어 있습니다.");
        }
        LostReport report = findOwned(reportId, userId);
        String lockReason = EditPolicy.lostReportContentLockReason(report.getStatus());
        if (lockReason != null) {
            throw new ConflictException(lockReason);
        }

        List<MultipartFile> files = ImageStorageService.nonEmpty(images);
        Map<String, String> errors = validate(request);
        List<LostReportImage> current = lostReportImageRepository.findByReport_ReportIdOrderBySortOrderAsc(reportId);
        ImageStorageService.ImagePlan plan = ImageStorageService.planUpdate(
                current.stream().map(LostReportImage::getImageUrl).toList(),
                request.getKeepImageUrls(), files.size(),
                request.getRepresentativeImageUrl(), request.getRepresentativeImageIndex(), errors);
        List<String> types = errors.containsKey("images") ? List.of()
                : imageStorageService.validate(files, plan.keep().size(), errors);
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        Category category = findCategory(request.getCategoryId());
        CampusBuilding building = findBuilding(request.getLostBuildingId());
        report.updateContent(category, request.getTitle().trim(), trimToNull(request.getDescription()),
                request.getLostDate(), normalizeEndDate(request.getLostDate(), request.getLostEndDate()),
                building, resolveLocationName(request.getLostLocation(), building),
                trimToNull(request.getLostLocationDetail()),
                request.getLostLatitude(), request.getLostLongitude());

        current.stream().filter(image -> plan.remove().contains(image.getImageUrl()))
                .forEach(lostReportImageRepository::delete);
        List<String> newUrls = imageStorageService.store(files, types);
        int order = 0;
        for (String url : plan.keep()) {
            LostReportImage image = current.stream().filter(i -> i.getImageUrl().equals(url)).findFirst().orElseThrow();
            image.changeOrder(order, order == plan.thumbnailIndex());
            order++;
        }
        for (String url : newUrls) {
            lostReportImageRepository.save(LostReportImage.builder()
                    .report(report).imageUrl(url).sortOrder(order).isThumbnail(order == plan.thumbnailIndex()).build());
            order++;
        }
        lostReportRepository.flush();
        return LostReportDTO.from(report, getImageUrls(reportId), true, null);
    }

    /** 찾는 중 ↔ 찾기 완료 ↔ 신고 종료 */
    @Transactional
    public LostReportDTO changeStatus(Long reportId, Long userId, LostReportStatus status) {
        LostReport report = findOwned(reportId, userId);
        if (!EditPolicy.lostReportStatusChangeAllowed(report.getStatus(), status)) {
            throw new ConflictException("이미 '" + report.getStatus().getLabel() + "' 상태입니다.");
        }
        report.changeStatus(status);
        lostReportRepository.flush();
        return LostReportDTO.from(report, getImageUrls(reportId), true,
                EditPolicy.lostReportContentLockReason(report.getStatus()));
    }

    /** Soft Delete. 분실 신고는 반환 이력과 연결되지 않으므로 본인이면 언제든 삭제할 수 있다. */
    @Transactional
    public void delete(Long reportId, Long userId) {
        LostReport report = findOwned(reportId, userId);
        report.softDelete();
        lostReportRepository.flush();
    }

    // ------------------------------------------------------------------ 검증

    Map<String, String> validate(LostReportRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        String title = trimToNull(request.getTitle());
        if (title == null) {
            errors.put("title", "물품명을 입력해 주세요.");
        } else if (title.length() > 100) {
            errors.put("title", "물품명은 100자 이하로 입력해 주세요.");
        }
        if (request.getCategoryId() == null) {
            errors.put("categoryId", "물품 종류를 선택해 주세요.");
        }
        if (request.getDescription() != null && request.getDescription().length() > 1000) {
            errors.put("description", "물품 특징은 1000자 이하로 입력해 주세요.");
        }

        LocalDate today = LocalDate.now();
        LocalDate start = request.getLostDate();
        LocalDate end = request.getLostEndDate();
        if (start == null) {
            errors.put("lostDate", "잃어버린 날짜를 입력해 주세요. 정확하지 않으면 기간으로 입력할 수 있어요.");
        } else if (start.isAfter(today)) {
            errors.put("lostDate", "잃어버린 날짜는 오늘 이후일 수 없습니다.");
        } else if (end != null) {
            if (end.isBefore(start)) {
                errors.put("lostEndDate", "기간의 끝 날짜는 시작 날짜보다 빠를 수 없습니다.");
            } else if (end.isAfter(today)) {
                errors.put("lostEndDate", "기간의 끝 날짜는 오늘 이후일 수 없습니다.");
            }
        }

        if (request.getLostBuildingId() == null && trimToNull(request.getLostLocation()) == null) {
            errors.put("lostLocation", "잃어버렸을 것 같은 대표 장소를 하나 선택하거나 입력해 주세요.");
        }
        if (lengthOver(request.getLostLocation(), 255)) {
            errors.put("lostLocation", "장소 이름은 255자 이하로 입력해 주세요.");
        }
        if (lengthOver(request.getLostLocationDetail(), 255)) {
            errors.put("lostLocationDetail", "추가 설명은 255자 이하로 입력해 주세요.");
        }
        FoundItemService.validateCoordinates(errors, "lostCoordinates", request.getLostLatitude(), request.getLostLongitude());
        return errors;
    }

    // ------------------------------------------------------------------ 보조

    private LostReport findNotDeleted(Long reportId) {
        return lostReportRepository.findByIdNotDeleted(reportId)
                .orElseThrow(() -> new NotFoundException("분실 신고를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다."));
    }

    private LostReport findOwned(Long reportId, Long userId) {
        LostReport report = findNotDeleted(reportId);
        if (!report.getUser().getUserId().equals(userId)) {
            throw new ForbiddenException("본인이 등록한 분실 신고만 수정·삭제할 수 있습니다.");
        }
        return report;
    }

    private Category findCategory(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new FieldValidationException(Map.of("categoryId", "존재하지 않는 물품 종류입니다.")));
    }

    private CampusBuilding findBuilding(Long buildingId) {
        if (buildingId == null) {
            return null;
        }
        return campusBuildingRepository.findById(buildingId)
                .orElseThrow(() -> new FieldValidationException(Map.of("lostLocation", "존재하지 않는 건물입니다.")));
    }

    /** 직접 입력한 장소 이름이 없으면 고른 건물 이름을 대표 위치로 쓴다 */
    private static String resolveLocationName(String typed, CampusBuilding building) {
        String name = trimToNull(typed);
        if (name == null && building != null) {
            name = building.getBuildingName();
        }
        return name;
    }

    /** 끝 날짜가 시작 날짜와 같으면 하루짜리로 본다(null 저장) */
    static LocalDate normalizeEndDate(LocalDate start, LocalDate end) {
        return end == null || end.equals(start) ? null : end;
    }

    private List<String> getImageUrls(Long reportId) {
        return lostReportImageRepository.findByReport_ReportIdOrderBySortOrderAsc(reportId).stream()
                .sorted(Comparator.comparing((LostReportImage image) -> !Boolean.TRUE.equals(image.getIsThumbnail())))
                .map(LostReportImage::getImageUrl)
                .toList();
    }

    private String getThumbnailUrl(Long reportId) {
        List<String> urls = getImageUrls(reportId);
        return urls.isEmpty() ? null : urls.get(0);
    }

    private static LostReportStatus parseStatus(String status) {
        String value = trimToNull(status);
        return value == null ? null : LostReportStatus.fromValue(value);
    }

    private static int clampSize(int size) {
        return size <= 0 ? 20 : Math.min(size, MAX_PAGE_SIZE);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean lengthOver(String value, int max) {
        return value != null && value.length() > max;
    }
}
