package com.thatsmine.service;

import com.thatsmine.dto.AdminFoundItemDTO;
import com.thatsmine.dto.CampusBuildingDTO;
import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.StorageInfoDTO;
import com.thatsmine.dto.admin.AdminFoundLocationRequest;
import com.thatsmine.dto.admin.AdminStorageLocationDTO;
import com.thatsmine.dto.admin.AdminStorageRequest;
import com.thatsmine.dto.admin.BuildingRequest;
import com.thatsmine.dto.admin.ChangeItemStatusRequest;
import com.thatsmine.dto.admin.StorageLocationRequest;
import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.FoundItemImage;
import com.thatsmine.entity.StorageLocation;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import com.thatsmine.exception.ConflictException;
import com.thatsmine.exception.FieldValidationException;
import com.thatsmine.exception.NotFoundException;
import com.thatsmine.repository.CampusBuildingRepository;
import com.thatsmine.repository.FoundItemImageRepository;
import com.thatsmine.repository.FoundItemRepository;
import com.thatsmine.repository.ReturnRequestRepository;
import com.thatsmine.repository.StorageLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 기능(SPEC §16): 습득물 조회·숨김·발견 위치 수정·보관 위치 지정, 교내 건물·공식 보관 장소 관리.
 * 접근 제어는 SecurityConfig(/api/v1/admin/** → ROLE_ADMIN)가 하고, 상태 전이는 여기서 다시 검증한다.
 * 반환 신청 처리는 {@link ReturnRequestService}, 분실 신고 목록은 {@link LostReportService}에 있다.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final ReturnRequestRepository returnRequestRepository;

    // ------------------------------------------------------------------ 습득물

    @Transactional(readOnly = true)
    public PageResponse<AdminFoundItemDTO> searchFoundItems(String keyword, String status, Long categoryId, int page, int size) {
        FoundItemStatus st = null;
        if (status != null && !status.isBlank()) {
            try {
                st = FoundItemStatus.fromValue(status.trim());
            } catch (IllegalArgumentException e) {
                throw new FieldValidationException(Map.of("status", "올바르지 않은 처리 상태입니다."));
            }
        }
        int pageSize = size <= 0 ? 20 : Math.min(size, 50);
        Page<FoundItem> result = foundItemRepository.searchForAdmin(trimToNull(keyword), st, categoryId,
                PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(result.map(this::toDto));
    }

    @Transactional
    public AdminFoundItemDTO changeStatus(Long itemId, ChangeItemStatusRequest request) {
        FoundItemStatus to = parseItemStatus(request == null ? null : request.getStatus());
        FoundItem item = lockItem(itemId);
        String reason = ReturnPolicy.adminStatusBlockReason(item.getStatus(), to, item.getCustodyType(), hasActiveRequests(itemId));
        if (reason != null) {
            throw new ConflictException(reason);
        }
        item.changeStatus(to);
        foundItemRepository.flush();
        return toDto(item);
    }

    /**
     * 실제 보관 위치 지정. 보관 장소가 정해지면(전달 완료) 접수 상태는 '보관 중'으로,
     * 다시 '전달 예정'으로 돌리면 '신고 접수'로 함께 맞춘다. 반환 완료된 물품은 바꾸지 않는다.
     */
    @Transactional
    public AdminFoundItemDTO updateStorage(Long itemId, AdminStorageRequest request) {
        FoundItem item = lockItem(itemId);
        if (item.getStatus() == FoundItemStatus.RETURNED) {
            throw new ConflictException("반환이 완료된 물품은 보관 위치를 바꿀 수 없습니다.");
        }
        Map<String, String> errors = new LinkedHashMap<>();
        FoundItemService.validateCustody(errors, request.getCustodyType(), request.getStorageId(),
                request.getStorageLocation(), request.getStorageLocationDetail(),
                request.getStorageLatitude(), request.getStorageLongitude());
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }

        CustodyType custody = request.getCustodyType();
        if (custody == CustodyType.HANDED_OVER) {
            String detail = trimToNull(request.getStorageLocationDetail());
            if (request.getStorageId() != null) {
                StorageLocation storage = storageLocationRepository.findById(request.getStorageId())
                        .filter(s -> Boolean.TRUE.equals(s.getActive()))
                        .orElseThrow(() -> new FieldValidationException(Map.of("storageId", "선택한 보관 장소를 사용할 수 없습니다.")));
                item.updateCustody(custody, storage, storage.getStorageName(), detail, storage.getLatitude(), storage.getLongitude());
            } else {
                item.updateCustody(custody, null, trimToNull(request.getStorageLocation()), detail,
                        request.getStorageLatitude(), request.getStorageLongitude());
            }
            if (item.getStatus() == FoundItemStatus.REPORTED) {
                item.changeStatus(FoundItemStatus.STORED);
            }
        } else {
            item.updateCustody(custody, null, null, null, null, null);
            if (custody == CustodyType.PENDING_HANDOVER && item.getStatus() == FoundItemStatus.STORED) {
                item.changeStatus(FoundItemStatus.REPORTED);
            }
        }
        foundItemRepository.flush();
        return toDto(item);
    }

    /** 잘못 입력된 발견 위치를 바로잡는다(보관 위치와 별개). */
    @Transactional
    public AdminFoundItemDTO updateFoundLocation(Long itemId, AdminFoundLocationRequest request) {
        FoundItem item = lockItem(itemId);
        Map<String, String> errors = new LinkedHashMap<>();
        String text = trimToNull(request.getFoundLocation());
        String detail = trimToNull(request.getFoundLocationDetail());
        if (request.getFoundBuildingId() == null && text == null) {
            errors.put("foundLocation", "발견 위치를 선택하거나 입력해 주세요.");
        }
        if (FoundItemService.lengthOver(text, 255) || FoundItemService.lengthOver(detail, 255)) {
            errors.put("foundLocationDetail", "위치 설명은 255자 이하로 입력해 주세요.");
        }
        FoundItemService.validateCoordinates(errors, "foundCoordinates", request.getFoundLatitude(), request.getFoundLongitude());
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
        CampusBuilding building = null;
        if (request.getFoundBuildingId() != null) {
            building = campusBuildingRepository.findById(request.getFoundBuildingId())
                    .orElseThrow(() -> new FieldValidationException(Map.of("foundBuildingId", "존재하지 않는 건물입니다.")));
        }
        if (text == null && building != null) {
            text = building.getBuildingName();
        }
        item.updateFoundLocation(building, text, detail, request.getFoundLatitude(), request.getFoundLongitude());
        foundItemRepository.flush();
        return toDto(item);
    }

    // ------------------------------------------------------------------ 교내 건물

    @Transactional
    public CampusBuildingDTO createBuilding(BuildingRequest request) {
        validateBuilding(request, null);
        CampusBuilding saved = campusBuildingRepository.save(CampusBuilding.builder()
                .buildingName(request.getBuildingName().trim())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .description(trimToNull(request.getDescription()))
                .build());
        return CampusBuildingDTO.from(saved);
    }

    @Transactional
    public CampusBuildingDTO updateBuilding(Long buildingId, BuildingRequest request) {
        CampusBuilding building = campusBuildingRepository.findById(buildingId)
                .orElseThrow(() -> new NotFoundException("건물을 찾을 수 없습니다."));
        validateBuilding(request, buildingId);
        building.update(request.getBuildingName().trim(), request.getLatitude(), request.getLongitude(),
                trimToNull(request.getDescription()));
        campusBuildingRepository.flush();
        return CampusBuildingDTO.from(building);
    }

    // ------------------------------------------------------------------ 공식 보관 장소

    @Transactional(readOnly = true)
    public List<AdminStorageLocationDTO> listStorageLocations() {
        return storageLocationRepository.findAllByOrderByStorageNameAsc().stream()
                .map(AdminStorageLocationDTO::from).toList();
    }

    @Transactional
    public AdminStorageLocationDTO createStorageLocation(StorageLocationRequest request) {
        CampusBuilding building = validateStorage(request);
        StorageLocation saved = storageLocationRepository.save(StorageLocation.builder()
                .building(building)
                .storageName(request.getStorageName().trim())
                .latitude(coordOrBuilding(request.getLatitude(), building.getLatitude()))
                .longitude(coordOrBuilding(request.getLongitude(), building.getLongitude()))
                .detailLocation(trimToNull(request.getDetailLocation()))
                .description(trimToNull(request.getDescription()))
                .contactPhone(trimToNull(request.getContactPhone()))
                .operatingHours(trimToNull(request.getOperatingHours()))
                .pickupGuide(trimToNull(request.getPickupGuide()))
                .active(request.getActive() == null || request.getActive())
                .build());
        return AdminStorageLocationDTO.from(saved);
    }

    @Transactional
    public AdminStorageLocationDTO updateStorageLocation(Long storageId, StorageLocationRequest request) {
        StorageLocation storage = storageLocationRepository.findById(storageId)
                .orElseThrow(() -> new NotFoundException("보관 장소를 찾을 수 없습니다."));
        CampusBuilding building = validateStorage(request);
        storage.update(building, request.getStorageName().trim(),
                coordOrBuilding(request.getLatitude(), building.getLatitude()),
                coordOrBuilding(request.getLongitude(), building.getLongitude()),
                trimToNull(request.getDetailLocation()), trimToNull(request.getDescription()),
                trimToNull(request.getContactPhone()), trimToNull(request.getOperatingHours()),
                trimToNull(request.getPickupGuide()),
                request.getActive() == null ? Boolean.TRUE.equals(storage.getActive()) : request.getActive());
        storageLocationRepository.flush();
        return AdminStorageLocationDTO.from(storage);
    }

    // ------------------------------------------------------------------ 검증·보조

    private void validateBuilding(BuildingRequest request, Long selfId) {
        Map<String, String> errors = new LinkedHashMap<>();
        String name = request == null ? null : trimToNull(request.getBuildingName());
        if (name == null) {
            errors.put("buildingName", "건물 이름을 입력해 주세요.");
        } else if (name.length() > 100) {
            errors.put("buildingName", "건물 이름은 100자 이하로 입력해 주세요.");
        } else {
            campusBuildingRepository.findByBuildingName(name)
                    .filter(existing -> !existing.getBuildingId().equals(selfId))
                    .ifPresent(existing -> errors.put("buildingName", "같은 이름의 건물이 이미 있습니다."));
        }
        if (request != null) {
            if (request.getLatitude() == null || request.getLongitude() == null) {
                errors.put("coordinates", "위도와 경도를 입력해 주세요.");
            } else {
                FoundItemService.validateCoordinates(errors, "coordinates", request.getLatitude(), request.getLongitude());
            }
            if (FoundItemService.lengthOver(request.getDescription(), 1000)) {
                errors.put("description", "설명은 1000자 이하로 입력해 주세요.");
            }
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
    }

    /** 보관 장소 입력을 검증하고 소속 건물을 돌려준다. 좌표를 비우면 건물 좌표를 쓴다. */
    private CampusBuilding validateStorage(StorageLocationRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        CampusBuilding building = null;
        if (request.getBuildingId() == null) {
            errors.put("buildingId", "보관 장소가 있는 건물을 선택해 주세요.");
        } else {
            building = campusBuildingRepository.findById(request.getBuildingId()).orElse(null);
            if (building == null) {
                errors.put("buildingId", "존재하지 않는 건물입니다.");
            }
        }
        String name = trimToNull(request.getStorageName());
        if (name == null) {
            errors.put("storageName", "보관 장소 이름을 입력해 주세요.");
        } else if (name.length() > 100) {
            errors.put("storageName", "보관 장소 이름은 100자 이하로 입력해 주세요.");
        }
        FoundItemService.validateCoordinates(errors, "coordinates", request.getLatitude(), request.getLongitude());
        if (FoundItemService.lengthOver(request.getDetailLocation(), 255)) {
            errors.put("detailLocation", "상세 위치는 255자 이하로 입력해 주세요.");
        }
        if (FoundItemService.lengthOver(request.getContactPhone(), 20)) {
            errors.put("contactPhone", "문의 전화는 20자 이하로 입력해 주세요.");
        }
        if (FoundItemService.lengthOver(request.getOperatingHours(), 100)) {
            errors.put("operatingHours", "운영 시간은 100자 이하로 입력해 주세요.");
        }
        if (FoundItemService.lengthOver(request.getPickupGuide(), 1000)
                || FoundItemService.lengthOver(request.getDescription(), 1000)) {
            errors.put("pickupGuide", "수령 안내와 설명은 1000자 이하로 입력해 주세요.");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
        return building;
    }

    private static BigDecimal coordOrBuilding(BigDecimal value, BigDecimal fallback) {
        return value != null ? value : fallback;
    }

    private FoundItem lockItem(Long itemId) {
        return foundItemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new NotFoundException("습득물을 찾을 수 없습니다."));
    }

    private boolean hasActiveRequests(Long itemId) {
        return returnRequestRepository.existsByItem_ItemIdAndStatusIn(itemId, ReturnRequestStatus.ACTIVE);
    }

    private static FoundItemStatus parseItemStatus(String value) {
        if (value == null || value.isBlank()) {
            throw new FieldValidationException(Map.of("status", "바꿀 상태를 선택해 주세요."));
        }
        try {
            return FoundItemStatus.fromValue(value.trim());
        } catch (IllegalArgumentException e) {
            throw new FieldValidationException(Map.of("status", "올바르지 않은 처리 상태입니다."));
        }
    }

    private AdminFoundItemDTO toDto(FoundItem item) {
        StorageInfoDTO storageInfo = item.getStorage() != null ? StorageInfoDTO.from(item.getStorage()) : null;
        List<String> images = foundItemImageRepository.findByItem_ItemIdOrderBySortOrderAsc(item.getItemId()).stream()
                .sorted(Comparator.comparing((FoundItemImage image) -> !Boolean.TRUE.equals(image.getIsThumbnail())))
                .map(FoundItemImage::getImageUrl)
                .toList();
        AdminFoundItemDTO dto = AdminFoundItemDTO.from(item, images, storageInfo);
        boolean active = hasActiveRequests(item.getItemId());
        dto.setAllowedStatuses(ReturnPolicy.adminSelectableStatuses(item.getStatus(), item.getCustodyType(), active)
                .stream().map(FoundItemStatus::getValue).toList());
        dto.setPendingReturnRequests((int) returnRequestRepository
                .countByItem_ItemIdAndStatus(item.getItemId(), ReturnRequestStatus.PENDING));
        return dto;
    }

    private static String trimToNull(String value) {
        return FoundItemService.trimToNull(value);
    }
}
