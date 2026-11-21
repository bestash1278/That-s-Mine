package com.thatsmine.service;

import com.thatsmine.dto.*;
import com.thatsmine.entity.*;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FoundItemService {
    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final UserRepository userRepository;
    private final SearchSynonymService searchSynonymService;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Transactional
    public PageResponse<FoundItemListItemDTO> searchFoundItems(
            String keyword,
            Long categoryId,
            Long buildingId,
            String status,
            LocalDate startDate,
            LocalDate endDate,
            String sort,
            Pageable pageable) {

        FoundItemStatus statusEnum = status != null ? FoundItemStatus.fromValue(status) : null;
        String expandedKeyword = null;

        if (keyword != null && !keyword.trim().isEmpty()) {
            Set<String> expandedTerms = searchSynonymService.expandKeywords(keyword);
            expandedKeyword = String.join("|", expandedTerms);
        }

        Page<FoundItem> page = foundItemRepository.search(
                expandedKeyword,
                categoryId,
                buildingId,
                statusEnum,
                startDate,
                endDate,
                pageable);

        return PageResponse.from(page.map(item -> {
            String firstImageUrl = getFirstImageUrl(item.getItemId());
            return FoundItemListItemDTO.from(item, firstImageUrl);
        }));
    }

    @Transactional
    public PublicFoundItemDTO getFoundItemDetail(Long itemId) {
        FoundItem item = foundItemRepository.findByIdNotDeleted(itemId)
                .orElseThrow(() -> new IllegalArgumentException("습득물을 찾을 수 없습니다."));

        List<String> imageUrls = getImageUrls(item.getItemId());
        StorageInfoDTO storageInfo = item.getStorage() != null ? StorageInfoDTO.from(item.getStorage()) : null;

        return PublicFoundItemDTO.from(item, imageUrls, storageInfo);
    }

    @Transactional
    public AdminFoundItemDTO getFoundItemDetailForAdmin(Long itemId) {
        FoundItem item = foundItemRepository.findByIdNotDeleted(itemId)
                .orElseThrow(() -> new IllegalArgumentException("습득물을 찾을 수 없습니다."));

        List<String> imageUrls = getImageUrls(item.getItemId());
        StorageInfoDTO storageInfo = item.getStorage() != null ? StorageInfoDTO.from(item.getStorage()) : null;

        return AdminFoundItemDTO.from(item, imageUrls, storageInfo);
    }

    @Transactional
    public PageResponse<FoundItemListItemDTO> getRecentFoundItems(int limit, Pageable pageable) {
        Page<FoundItem> page = foundItemRepository.findRecentNotDeleted(pageable);

        return PageResponse.from(page.map(item -> {
            String firstImageUrl = getFirstImageUrl(item.getItemId());
            return FoundItemListItemDTO.from(item, firstImageUrl);
        }));
    }

    @Transactional
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

        FoundItemStatus statusEnum = status != null ? FoundItemStatus.fromValue(status) : null;
        String expandedKeyword = null;

        if (keyword != null && !keyword.trim().isEmpty()) {
            Set<String> expandedTerms = searchSynonymService.expandKeywords(keyword);
            expandedKeyword = String.join("|", expandedTerms);
        }

        List<FoundItem> items = foundItemRepository.searchByMapBounds(
                minLat, maxLat, minLng, maxLng,
                expandedKeyword, categoryId, statusEnum, startDate, endDate);

        return items.stream()
                .map(item -> {
                    List<String> imageUrls = getImageUrls(item.getItemId());
                    StorageInfoDTO storageInfo = item.getStorage() != null ? StorageInfoDTO.from(item.getStorage()) : null;
                    return PublicFoundItemDTO.from(item, imageUrls, storageInfo);
                })
                .toList();
    }

    @Transactional
    public PublicFoundItemDTO createFoundItem(CreateFoundItemRequest request, List<MultipartFile> images, Long reporterId) {
        validateFoundDate(request.getFoundDate());
        validateCoordinates(request.getFoundLatitude(), request.getFoundLongitude());
        if (request.getStorageLatitude() != null && request.getStorageLongitude() != null) {
            validateCoordinates(request.getStorageLatitude(), request.getStorageLongitude());
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("카테고리를 찾을 수 없습니다."));

        CampusBuilding foundBuilding = null;
        if (request.getFoundBuildingId() != null) {
            foundBuilding = campusBuildingRepository.findById(request.getFoundBuildingId())
                    .orElseThrow(() -> new IllegalArgumentException("건물을 찾을 수 없습니다."));
        }

        StorageLocation storage = null;
        if (request.getStorageId() != null && request.getCustodyType() == CustodyType.HANDED_OVER) {
            storage = storageLocationRepository.findById(request.getStorageId())
                    .orElseThrow(() -> new IllegalArgumentException("보관 위치를 찾을 수 없습니다."));
        }

        FoundItem item = FoundItem.builder()
                .reporter(reporter)
                .category(category)
                .foundBuilding(foundBuilding)
                .storage(storage)
                .title(request.getTitle())
                .description(request.getDescription())
                .privateFeatures(request.getPrivateFeatures())
                .foundDate(request.getFoundDate())
                .foundTime(request.getFoundTime())
                .foundLocation(request.getFoundLocation())
                .foundLocationDetail(request.getFoundLocationDetail())
                .foundLatitude(request.getFoundLatitude())
                .foundLongitude(request.getFoundLongitude())
                .storageLocation(request.getStorageLocation())
                .storageLocationDetail(request.getStorageLocationDetail())
                .storageLatitude(request.getStorageLatitude())
                .storageLongitude(request.getStorageLongitude())
                .custodyType(request.getCustodyType())
                .status(FoundItemStatus.REPORTED)
                .build();

        FoundItem savedItem = foundItemRepository.save(item);

        if (images != null && !images.isEmpty()) {
            saveImages(savedItem.getItemId(), images, request.getRepresentativeImageIndex());
        }

        List<String> imageUrls = getImageUrls(savedItem.getItemId());
        StorageInfoDTO storageInfo = savedItem.getStorage() != null ? StorageInfoDTO.from(savedItem.getStorage()) : null;

        return PublicFoundItemDTO.from(savedItem, imageUrls, storageInfo);
    }

    private void validateFoundDate(LocalDate foundDate) {
        if (foundDate != null && foundDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("발견 날짜는 미래일 수 없습니다.");
        }
    }

    private void validateCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            return;
        }
        if (latitude.compareTo(BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(BigDecimal.valueOf(90)) > 0) {
            throw new IllegalArgumentException("위도는 -90에서 90 사이여야 합니다.");
        }
        if (longitude.compareTo(BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(BigDecimal.valueOf(180)) > 0) {
            throw new IllegalArgumentException("경도는 -180에서 180 사이여야 합니다.");
        }
    }

    private void saveImages(Long itemId, List<MultipartFile> images, Integer representativeIndex) {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            for (int i = 0; i < images.size(); i++) {
                MultipartFile file = images.get(i);
                if (file.isEmpty()) continue;

                validateImageFile(file);

                String uuid = UUID.randomUUID().toString();
                String fileName = uuid + getFileExtension(file.getOriginalFilename());
                Path filePath = uploadPath.resolve(fileName);

                Files.write(filePath, file.getBytes());

                FoundItemImage image = FoundItemImage.builder()
                        .item(FoundItem.builder().itemId(itemId).build())
                        .imageUrl("/uploads/" + fileName)
                        .sortOrder(i)
                        .isThumbnail(representativeIndex != null && representativeIndex == i)
                        .build();

                foundItemImageRepository.save(image);
            }
        } catch (IOException e) {
            throw new RuntimeException("이미지 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private void validateImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (!isValidImageType(contentType)) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다.");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("이미지 크기는 5MB 이하여야 합니다.");
        }

        byte[] bytes = new byte[12];
        try {
            file.getInputStream().read(bytes);
            if (!isValidMagicBytes(bytes, contentType)) {
                throw new IllegalArgumentException("파일 형식이 일치하지 않습니다.");
            }
        } catch (IOException e) {
            throw new RuntimeException("파일 검증 중 오류: " + e.getMessage());
        }
    }

    private boolean isValidImageType(String contentType) {
        if (contentType == null) return false;
        return contentType.equals("image/jpeg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/webp");
    }

    private boolean isValidMagicBytes(byte[] bytes, String contentType) {
        if (contentType.equals("image/jpeg")) {
            return bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8;
        }
        if (contentType.equals("image/png")) {
            return bytes[0] == (byte) 0x89 && bytes[1] == 0x50;
        }
        if (contentType.equals("image/webp")) {
            return bytes[0] == 0x52 && bytes[1] == 0x49;
        }
        return false;
    }

    private String getFileExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "";
        }
        return "." + originalFilename.substring(originalFilename.lastIndexOf(".") + 1);
    }

    private String getFirstImageUrl(Long itemId) {
        List<FoundItemImage> images = foundItemImageRepository.findByItemIdOrderBySortOrder(itemId);
        if (images.isEmpty()) {
            return null;
        }
        return images.get(0).getImageUrl();
    }

    private List<String> getImageUrls(Long itemId) {
        List<FoundItemImage> images = foundItemImageRepository.findByItemIdOrderBySortOrder(itemId);
        return images.stream()
                .map(FoundItemImage::getImageUrl)
                .toList();
    }
}
