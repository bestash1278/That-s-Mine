package com.thatsmine.service;

import com.thatsmine.entity.*;
import com.thatsmine.enums.*;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@Profile("dev")
@RequiredArgsConstructor
public class DemoResetService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final LostReportRepository lostReportRepository;
    private final ReturnRequestRepository returnRequestRepository;

    @Transactional
    public void resetDemoData() {
        returnRequestRepository.deleteAll();
        foundItemImageRepository.deleteAll();
        foundItemRepository.deleteAll();
        lostReportRepository.deleteAll();
        storageLocationRepository.deleteAll();
        campusBuildingRepository.deleteAll();
        userRepository.deleteAll();

        initializeBuildings();
        initializeStorageLocations();
        initializeUsers();
        initializeFoundItems();
    }

    private void initializeBuildings() {
        CampusBuilding lib = CampusBuilding.builder()
            .buildingName("도서관")
            .latitude(new BigDecimal("37.4979"))
            .longitude(new BigDecimal("126.9566"))
            .description("시연용 도서관")
            .build();
        campusBuildingRepository.save(lib);

        CampusBuilding studentCenter = CampusBuilding.builder()
            .buildingName("학생회관")
            .latitude(new BigDecimal("37.4984"))
            .longitude(new BigDecimal("126.9576"))
            .description("시연용 학생회관")
            .build();
        campusBuildingRepository.save(studentCenter);

        CampusBuilding adminBuilding = CampusBuilding.builder()
            .buildingName("행정관")
            .latitude(new BigDecimal("37.4989"))
            .longitude(new BigDecimal("126.9586"))
            .description("시연용 행정관")
            .build();
        campusBuildingRepository.save(adminBuilding);
    }

    private void initializeStorageLocations() {
        List<CampusBuilding> buildings = campusBuildingRepository.findAll();
        for (CampusBuilding building : buildings) {
            if (building.getBuildingName().equals("도서관")) {
                StorageLocation storage = StorageLocation.builder()
                    .building(building)
                    .storageName("도서관 분실물 보관소")
                    .latitude(new BigDecimal("37.4979"))
                    .longitude(new BigDecimal("126.9566"))
                    .detailLocation("1층 로비")
                    .description("도서관 습득물 보관")
                    .contactPhone("02-123-4567")
                    .operatingHours("09:00 ~ 18:00")
                    .pickupGuide("신분증 필수 지참")
                    .active(true)
                    .build();
                storageLocationRepository.save(storage);
            }
        }
    }

    private void initializeUsers() {
        User admin = User.builder()
            .email("admin@demo.com")
            .passwordHash("$2a$10$dXJ3SW6G7P50eS3BQyHVkuJ5H3T4ECVL3WqcCi4UfJjHKf.0wUEIe")
            .nickname("관리자")
            .role(UserRole.ADMIN)
            .build();
        userRepository.save(admin);

        User user1 = User.builder()
            .email("user1@demo.com")
            .passwordHash("$2a$10$dXJ3SW6G7P50eS3BQyHVkuJ5H3T4ECVL3WqcCi4UfJjHKf.0wUEIe")
            .nickname("사용자1")
            .role(UserRole.USER)
            .build();
        userRepository.save(user1);

        User user2 = User.builder()
            .email("user2@demo.com")
            .passwordHash("$2a$10$dXJ3SW6G7P50eS3BQyHVkuJ5H3T4ECVL3WqcCi4UfJjHKf.0wUEIe")
            .nickname("사용자2")
            .role(UserRole.USER)
            .build();
        userRepository.save(user2);
    }

    private void initializeFoundItems() {
        User user1 = userRepository.findByEmail("user1@demo.com").orElse(null);
        Category wallet = categoryRepository.findAll().stream()
            .filter(c -> c.getCategoryName().equals("지갑"))
            .findFirst()
            .orElse(null);

        CampusBuilding lib = campusBuildingRepository.findAll().stream()
            .filter(b -> b.getBuildingName().equals("도서관"))
            .findFirst()
            .orElse(null);

        CampusBuilding adminBuilding = campusBuildingRepository.findAll().stream()
            .filter(b -> b.getBuildingName().equals("행정관"))
            .findFirst()
            .orElse(null);

        StorageLocation storage = storageLocationRepository.findAll().stream()
            .findFirst()
            .orElse(null);

        if (user1 != null && wallet != null && lib != null && storage != null) {
            FoundItem item = FoundItem.builder()
                .reporter(user1)
                .category(wallet)
                .foundBuilding(lib)
                .storage(storage)
                .title("파란색 파우치")
                .description("시연용 습득물 - 정답")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.now())
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("1층 열람실 테이블")
                .storageLocation("도서관 분실물 보관소")
                .storageLatitude(new BigDecimal("37.4979"))
                .storageLongitude(new BigDecimal("126.9566"))
                .storageLocationDetail("1층 로비")
                .custodyType(CustodyType.HANDED_OVER)
                .status(FoundItemStatus.STORED)
                .build();
            foundItemRepository.save(item);
        }
    }
}
