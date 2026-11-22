package com.thatsmine.service;

import com.thatsmine.dto.*;
import com.thatsmine.dto.me.MyFoundItemDTO;
import com.thatsmine.dto.me.MyFoundItemDetailDTO;
import com.thatsmine.entity.*;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import com.thatsmine.exception.ConflictException;
import com.thatsmine.exception.FieldValidationException;
import com.thatsmine.exception.ForbiddenException;
import com.thatsmine.exception.NotFoundException;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoundItemService {

    private static final int MAX_PAGE_SIZE = 50;
    static final int MAX_MAP_ITEMS = 300;

    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final UserRepository userRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final SearchSynonymService searchSynonymService;
    private final ImageStorageService imageStorageService;

    // ------------------------------------------------------------------ 조회

    @Transactional(readOnly = true)
    public PageResponse<FoundItemListItemDTO> searchFoundItems(
            String keyword,
            Long categoryId,
            Long buildingId,
            String status,
            LocalDate startDate,
            LocalDate endDate,
            String sort,
            int page,
            int size) {

        String[] kw = expandKeyword(keyword);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));

        Page<FoundItem> result = foundItemRepository.search(
                kw[0], kw[1], kw[2],
                categoryId,
                buildingId,
                parseStatus(status),
                FoundItemStatus.HIDDEN,
                startDate,
                endDate,
                pageable);

        return PageResponse.from(result.map(item -> FoundItemListItemDTO.from(item, getThumbnailUrl(item.getItemId()))));
    }

    @Transactional(readOnly = true)
    public PublicFoundItemDTO getFoundItemDetail(Long itemId) {
        FoundItem item = foundItemRepository.findByIdNotDeleted(itemId)
                .filter(found -> found.getStatus() != FoundItemStatus.HIDDEN)
                .orElseThrow(() -> new NotFoundException("습득물을 찾을 수 없습니다. 삭제되었거나 숨김 처리된 물품일 수 있습니다."));
        return toPublicDto(item);
    }

    @Transactional(readOnly = true)
    public AdminFoundItemDTO getFoundItemDetailForAdmin(Long itemId) {
        FoundItem item = foundItemRepository.findByIdNotDeleted(itemId)
                .orElseThrow(() -> new NotFoundException("습득물을 찾을 수 없습니다."));
        StorageInfoDTO storageInfo = item.getStorage() != null ? StorageInfoDTO.from(item.getStorage()) : null;
        return AdminFoundItemDTO.from(item, getImageUrls(item.getItemId()), storageInfo);
    }

    @Transactional(readOnly = true)
    public PageResponse<FoundItemListItemDTO> getRecentFoundItems(int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 20), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FoundItem> result = foundItemRepository.findRecentNotDeleted(FoundItemStatus.HIDDEN, pageable);
        return PageResponse.from(result.map(item -> FoundItemListItemDTO.from(item, getThumbnailUrl(item.getItemId()))));
    }

    @Transactional(readOnly = true)
    public List<PublicFoundItemDTO> getMapItems(
            BigDecimal minLat,
            BigDecimal maxLat,
            BigDecimal minLng,
            BigDecimal maxLng,
            String keyword,
            Long categoryId,
            String status,
            LocalDate startDate,
            LocalDate endDate) {

        validateBounds(minLat, maxLat, minLng, maxLng);
        String[] kw = expandKeyword(keyword);
        List<FoundItem> items = foundItemRepository.searchByMapBounds(
                minLat, maxLat, minLng, maxLng,
                kw[0], kw[1], kw[2],
                categoryId, parseStatus(status), FoundItemStatus.HIDDEN, startDate, endDate);

        // 한 번에 너무 많은 마커를 보내지 않는다. 확대하면 다시 검색할 수 있다.
        return items.stream().limit(MAX_MAP_ITEMS).map(this::toPublicDto).toList();
    }

    private static void validateBounds(BigDecimal minLat, BigDecimal maxLat, BigDecimal minLng, BigDecimal maxLng) {
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
    }

    // ------------------------------------------------------------------ 등록

    @Transactional
    public PublicFoundItemDTO createFoundItem(CreateFoundItemRequest request, List<MultipartFile> images, Long reporterId) {
        if (request == null) {
            throw new IllegalArgumentException("신고 내용이 비어 있습니다.");
        }
        List<MultipartFile> files = ImageStorageService.nonEmpty(images);

        Map<String, String> errors = validateCreateRequest(request);
        List<String> detectedTypes = imageStorageService.validate(files, 0, errors);
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new IllegalArgumentException("신고자 정보를 찾을 수 없습니다."));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new FieldValidationException(Map.of("categoryId", "존재하지 않는 물품 종류입니다.")));

        CampusBuilding foundBuilding = null;
        if (request.getFoundBuildingId() != null) {
            foundBuilding = campusBuildingRepository.findById(request.getFoundBuildingId())
                    .orElseThrow(() -> new FieldValidationException(Map.of("foundBuildingId", "존재하지 않는 건물입니다.")));
        }

        String foundLocation = trimToNull(request.getFoundLocation());
        if (foundLocation == null && foundBuilding != null) {
            foundLocation = foundBuilding.getBuildingName();
        }

        CustodyType custodyType = request.getCustodyType();
        FoundItem.FoundItemBuilder builder = FoundItem.builder()
                .reporter(reporter)
                .category(category)
                .foundBuilding(foundBuilding)
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .privateFeatures(trimToNull(request.getPrivateFeatures()))
                .foundDate(request.getFoundDate())
                .foundTime(request.getFoundTime())
                .foundLocation(foundLocation)
                .foundLocationDetail(trimToNull(request.getFoundLocationDetail()))
                .foundLatitude(request.getFoundLatitude())
                .foundLongitude(request.getFoundLongitude())
                .custodyType(custodyType)
                .status(FoundItemStatus.REPORTED);

        // 보관 위치는 '관리 부서에 전달 완료'일 때만 저장한다.
        // 전달 예정/임시 보관이면 임의의 장소를 남기지 않는다(화면에는 "보관 장소 확인 중").
        if (custodyType == CustodyType.HANDED_OVER) {
            if (request.getStorageId() != null) {
                StorageLocation storage = findActiveStorage(request.getStorageId());
                builder.storage(storage)
                        .storageLocation(storage.getStorageName())
                        .storageLatitude(request.getStorageLatitude() != null ? request.getStorageLatitude() : storage.getLatitude())
                        .storageLongitude(request.getStorageLongitude() != null ? request.getStorageLongitude() : storage.getLongitude());
            } else {
                builder.storageLocation(trimToNull(request.getStorageLocation()))
                        .storageLatitude(request.getStorageLatitude())
                        .storageLongitude(request.getStorageLongitude());
            }
            builder.storageLocationDetail(trimToNull(request.getStorageLocationDetail()));
        }

        FoundItem savedItem = foundItemRepository.save(builder.build());

        if (!files.isEmpty()) {
            List<String> urls = imageStorageService.store(files, detectedTypes);
            Integer rep = request.getRepresentativeImageIndex();
            int thumbnail = rep != null && rep >= 0 && rep < urls.size() ? rep : 0;
            for (int i = 0; i < urls.size(); i++) {
                foundItemImageRepository.save(FoundItemImage.builder()
                        .item(savedItem).imageUrl(urls.get(i)).sortOrder(i).isThumbnail(i == thumbnail).build());
            }
        }

        return toPublicDto(savedItem);
    }

    // ------------------------------------------------------------------ 신고자 본인: 내 목록·수정·삭제 (9단계)

    @Transactional(readOnly = true)
    public PageResponse<MyFoundItemDTO> getMyFoundItems(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<FoundItem> result = foundItemRepository.findByReporter_UserIdAndDeletedAtIsNull(userId, pageable);
        List<Long> ids = result.getContent().stream().map(FoundItem::getItemId).toList();
        Set<Long> withActiveRequest = ids.isEmpty() ? Set.of()
                : new HashSet<>(returnRequestRepository.findItemIdsWithStatusIn(ids, ReturnRequestStatus.ACTIVE));
        return PageResponse.from(result.map(item -> MyFoundItemDTO.from(
                item,
                getThumbnailUrl(item.getItemId()),
                EditPolicy.foundItemLockReason(item.getStatus(), withActiveRequest.contains(item.getItemId())))));
    }

    /** 수정 화면용 본인 상세(비공개 특징 포함) */
    @Transactional(readOnly = true)
    public MyFoundItemDetailDTO getMyFoundItem(Long itemId, Long userId) {
        FoundItem item = findOwnedItem(itemId, userId);
        return MyFoundItemDetailDTO.from(item, getImageUrls(itemId), lockReasonOf(item));
    }

    /**
     * 신고자 본인의 습득물 수정. 반환이 진행 중·완료됐거나 처리 중인 반환 신청이 있으면 409.
     * 보관 상태·보관 장소는 신고자가 바꿀 수 있다(예: 관리 부서에 맡긴 뒤). 처리 상태는 관리자만 바꾼다.
     */
    @Transactional
    public MyFoundItemDetailDTO updateFoundItem(Long itemId, Long userId, UpdateFoundItemRequest request,
                                                List<MultipartFile> images) {
        if (request == null) {
            throw new IllegalArgumentException("수정 내용이 비어 있습니다.");
        }
        FoundItem item = findOwnedItem(itemId, userId);
        String lockReason = lockReasonOf(item);
        if (lockReason != null) {
            throw new ConflictException(lockReason);
        }

        List<MultipartFile> files = ImageStorageService.nonEmpty(images);
        Map<String, String> errors = new LinkedHashMap<>();
        validateItemFields(errors, request.getTitle(), request.getDescription(), request.getPrivateFeatures(),
                request.getCategoryId(), request.getFoundDate(), request.getFoundTime(),
                request.getFoundBuildingId(), request.getFoundLocation(), request.getFoundLocationDetail(),
                request.getFoundLatitude(), request.getFoundLongitude());
        validateCustody(errors, request.getCustodyType(), request.getStorageId(), request.getStorageLocation(),
                request.getStorageLocationDetail(), request.getStorageLatitude(), request.getStorageLongitude());

        List<FoundItemImage> current = foundItemImageRepository.findByItem_ItemIdOrderBySortOrderAsc(itemId);
        ImageStorageService.ImagePlan plan = ImageStorageService.planUpdate(
                current.stream().map(FoundItemImage::getImageUrl).toList(),
                request.getKeepImageUrls(), files.size(),
                request.getRepresentativeImageUrl(), request.getRepresentativeImageIndex(), errors);
        List<String> types = errors.containsKey("images") ? List.of()
                : imageStorageService.validate(files, plan.keep().size(), errors);
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new FieldValidationException(Map.of("categoryId", "존재하지 않는 물품 종류입니다.")));
        CampusBuilding building = null;
        if (request.getFoundBuildingId() != null) {
            building = campusBuildingRepository.findById(request.getFoundBuildingId())
                    .orElseThrow(() -> new FieldValidationException(Map.of("foundBuildingId", "존재하지 않는 건물입니다.")));
        }
        String foundLocation = trimToNull(request.getFoundLocation());
        if (foundLocation == null && building != null) {
            foundLocation = building.getBuildingName();
        }

        item.updateByReporter(category, request.getTitle().trim(), trimToNull(request.getDescription()),
                trimToNull(request.getPrivateFeatures()), request.getFoundDate(), request.getFoundTime(),
                building, foundLocation, trimToNull(request.getFoundLocationDetail()),
                request.getFoundLatitude(), request.getFoundLongitude());

        // 보관 정보: '관리 부서에 전달 완료'일 때만 보관 장소를 남긴다(등록과 같은 규칙)
        if (request.getCustodyType() == CustodyType.HANDED_OVER) {
            if (request.getStorageId() != null) {
                StorageLocation storage = findActiveStorage(request.getStorageId());
                item.updateCustody(CustodyType.HANDED_OVER, storage, storage.getStorageName(),
                        trimToNull(request.getStorageLocationDetail()), storage.getLatitude(), storage.getLongitude());
            } else {
                item.updateCustody(CustodyType.HANDED_OVER, null, trimToNull(request.getStorageLocation()),
                        trimToNull(request.getStorageLocationDetail()),
                        request.getStorageLatitude(), request.getStorageLongitude());
            }
        } else {
            item.updateCustody(request.getCustodyType(), null, null, null, null, null);
        }

        // 사진: 지운 것은 DB에서 빼고(파일은 이력 보존을 위해 남김), 남긴 것 뒤에 새 사진을 붙인다
        current.stream().filter(image -> plan.remove().contains(image.getImageUrl()))
                .forEach(foundItemImageRepository::delete);
        List<String> newUrls = imageStorageService.store(files, types);
        int order = 0;
        for (String url : plan.keep()) {
            FoundItemImage image = current.stream().filter(i -> i.getImageUrl().equals(url)).findFirst().orElseThrow();
            image.changeOrder(order, order == plan.thumbnailIndex());
            order++;
        }
        for (String url : newUrls) {
            foundItemImageRepository.save(FoundItemImage.builder()
                    .item(item).imageUrl(url).sortOrder(order).isThumbnail(order == plan.thumbnailIndex()).build());
            order++;
        }
        foundItemRepository.flush();
        return MyFoundItemDetailDTO.from(item, getImageUrls(itemId), null);
    }

    /** 신고자 본인의 습득물 삭제(Soft Delete). 수정과 같은 제한을 적용한다. */
    @Transactional
    public void deleteFoundItem(Long itemId, Long userId) {
        FoundItem item = findOwnedItem(itemId, userId);
        String lockReason = lockReasonOf(item);
        if (lockReason != null) {
            throw new ConflictException(lockReason);
        }
        item.softDelete();
        foundItemRepository.flush();
    }

    private FoundItem findOwnedItem(Long itemId, Long userId) {
        FoundItem item = foundItemRepository.findByIdNotDeleted(itemId)
                .orElseThrow(() -> new NotFoundException("습득물을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다."));
        if (!item.getReporter().getUserId().equals(userId)) {
            throw new ForbiddenException("본인이 등록한 습득물만 수정·삭제할 수 있습니다.");
        }
        return item;
    }

    private String lockReasonOf(FoundItem item) {
        boolean active = returnRequestRepository.existsByItem_ItemIdAndStatusIn(item.getItemId(), ReturnRequestStatus.ACTIVE);
        return EditPolicy.foundItemLockReason(item.getStatus(), active);
    }

    // ------------------------------------------------------------------ 검증

    private Map<String, String> validateCreateRequest(CreateFoundItemRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        validateItemFields(errors, request.getTitle(), request.getDescription(), request.getPrivateFeatures(),
                request.getCategoryId(), request.getFoundDate(), request.getFoundTime(),
                request.getFoundBuildingId(), request.getFoundLocation(), request.getFoundLocationDetail(),
                request.getFoundLatitude(), request.getFoundLongitude());

        validateCustody(errors, request.getCustodyType(), request.getStorageId(), request.getStorageLocation(),
                request.getStorageLocationDetail(), request.getStorageLatitude(), request.getStorageLongitude());
        return errors;
    }

    /** 보관 상태·보관 장소 검증 (등록·수정 공통) */
    private static void validateCustody(Map<String, String> errors, CustodyType custodyType, Long storageId,
                                        String storageLocation, String storageLocationDetail,
                                        BigDecimal storageLatitude, BigDecimal storageLongitude) {
        if (custodyType == null) {
            errors.put("custodyType", "보관 상태를 선택해 주세요.");
        } else if (custodyType == CustodyType.HANDED_OVER) {
            if (storageId == null && trimToNull(storageLocation) == null) {
                errors.put("storageId", "물품을 전달한 보관 장소를 선택해 주세요.");
            }
            if (lengthOver(storageLocation, 255) || lengthOver(storageLocationDetail, 255)) {
                errors.put("storageLocationDetail", "보관 장소 설명은 255자 이하로 입력해 주세요.");
            }
            validateCoordinates(errors, "storageCoordinates", storageLatitude, storageLongitude);
        }
    }

    /** 공식 보관 장소 찾기(사용 중인 장소만) */
    private StorageLocation findActiveStorage(Long storageId) {
        return storageLocationRepository.findById(storageId)
                .filter(location -> Boolean.TRUE.equals(location.getActive()))
                .orElseThrow(() -> new FieldValidationException(Map.of("storageId", "선택한 보관 장소를 사용할 수 없습니다.")));
    }

    /** 등록·수정 공통 항목 검증 */
    private void validateItemFields(Map<String, String> errors, String rawTitle, String description, String privateFeatures,
                                    Long categoryId, LocalDate foundDate, LocalTime foundTime,
                                    Long foundBuildingId, String foundLocationText, String foundLocationDetail,
                                    BigDecimal latitude, BigDecimal longitude) {
        String title = trimToNull(rawTitle);
        if (title == null) {
            errors.put("title", "물품명을 입력해 주세요.");
        } else if (title.length() > 100) {
            errors.put("title", "물품명은 100자 이하로 입력해 주세요.");
        }
        if (description != null && description.length() > 1000) {
            errors.put("description", "물품 특징은 1000자 이하로 입력해 주세요.");
        }
        if (privateFeatures != null && privateFeatures.length() > 1000) {
            errors.put("privateFeatures", "비공개 특징은 1000자 이하로 입력해 주세요.");
        }
        if (categoryId == null) {
            errors.put("categoryId", "물품 종류를 선택해 주세요.");
        }

        LocalDate today = LocalDate.now();
        if (foundDate == null) {
            errors.put("foundDate", "발견 날짜를 입력해 주세요.");
        } else if (foundDate.isAfter(today)) {
            errors.put("foundDate", "발견 날짜는 오늘 이후일 수 없습니다.");
        } else if (foundDate.isEqual(today) && foundTime != null && foundTime.isAfter(LocalTime.now())) {
            errors.put("foundTime", "발견 시간은 현재 시각 이후일 수 없습니다.");
        }

        if (foundBuildingId == null && trimToNull(foundLocationText) == null) {
            errors.put("foundLocation", "발견 위치를 선택하거나 입력해 주세요.");
        }
        if (lengthOver(foundLocationText, 255) || lengthOver(foundLocationDetail, 255)) {
            errors.put("foundLocationDetail", "위치 설명은 255자 이하로 입력해 주세요.");
        }
        validateCoordinates(errors, "foundCoordinates", latitude, longitude);
    }

    static void validateCoordinates(Map<String, String> errors, String field, BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null && longitude == null) {
            return;
        }
        if (latitude == null || longitude == null) {
            errors.put(field, "위도와 경도는 함께 입력해야 합니다.");
            return;
        }
        if (latitude.compareTo(BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(BigDecimal.valueOf(90)) > 0) {
            errors.put(field, "위도는 -90에서 90 사이여야 합니다.");
        } else if (longitude.compareTo(BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
            errors.put(field, "경도는 -180에서 180 사이여야 합니다.");
        }
    }

    // ------------------------------------------------------------------ 변환·보조

    private PublicFoundItemDTO toPublicDto(FoundItem item) {
        StorageInfoDTO storageInfo = item.getStorage() != null ? StorageInfoDTO.from(item.getStorage()) : null;
        return PublicFoundItemDTO.from(item, getImageUrls(item.getItemId()), storageInfo);
    }

    /** 대표 사진을 맨 앞에 두고 나머지는 등록 순서대로. */
    private List<String> getImageUrls(Long itemId) {
        return foundItemImageRepository.findByItem_ItemIdOrderBySortOrderAsc(itemId).stream()
                .sorted(Comparator.comparing((FoundItemImage image) -> !Boolean.TRUE.equals(image.getIsThumbnail())))
                .map(FoundItemImage::getImageUrl)
                .toList();
    }

    private String getThumbnailUrl(Long itemId) {
        List<String> urls = getImageUrls(itemId);
        return urls.isEmpty() ? null : urls.get(0);
    }

    private String[] expandKeyword(String keyword) {
        return searchSynonymService.expandToThree(keyword);
    }

    private static Sort resolveSort(String sort) {
        if (sort == null) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        return switch (sort) {
            case "OLDEST" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "LATEST_FOUND" -> Sort.by(Sort.Order.desc("foundDate"), Sort.Order.desc("createdAt"));
            case "OLDEST_FOUND" -> Sort.by(Sort.Order.asc("foundDate"), Sort.Order.asc("createdAt"));
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    private static FoundItemStatus parseStatus(String status) {
        String value = trimToNull(status);
        return value == null ? null : FoundItemStatus.fromValue(value);
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, MAX_PAGE_SIZE);
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
