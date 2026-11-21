package com.thatsmine.config;

import com.thatsmine.entity.*;
import com.thatsmine.enums.*;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final FoundItemRepository foundItemRepository;
    private final SearchSynonymRepository searchSynonymRepository;

    private static final Set<String> INITIALIZED_EMAILS = new HashSet<>();

    @Override
    public void run(String... args) throws Exception {
        if (shouldInitializeData()) {
            initializeDevData();
        }
    }

    private boolean shouldInitializeData() {
        return userRepository.findByEmail("admin@demo.com").isEmpty();
    }

    private void initializeDevData() {
        initializeCategories();
        initializeUsers();
        initializeBuildings();
        initializeStorageLocations();
        initializeSearchSynonyms();
        initializeFoundItems();
    }

    private void initializeCategories() {
        String[] categoryNames = {"지갑", "휴대폰", "이어폰", "안경", "의류", "우산", "가방", "신발", "시계", "기타"};
        int order = 0;
        for (String name : categoryNames) {
            if (categoryRepository.findByCategoryName(name).isEmpty()) {
                Category cat = Category.builder()
                    .categoryName(name)
                    .sortOrder(order++)
                    .build();
                categoryRepository.save(cat);
            }
        }
    }

    private void initializeUsers() {
        User admin = User.builder()
            .email("admin@demo.com")
            .passwordHash("$2a$10$dXJ3SW6G7P50eS3BQyHVkuJ5H3T4ECVL3WqcCi4UfJjHKf.0wUEIe")
            .name("관리자")
            .nickname("관리자")
            .role(UserRole.ADMIN)
            .build();
        userRepository.save(admin);

        User user1 = User.builder()
            .email("user1@demo.com")
            .passwordHash("$2a$10$dXJ3SW6G7P50eS3BQyHVkuJ5H3T4ECVL3WqcCi4UfJjHKf.0wUEIe")
            .name("사용자1")
            .nickname("사용자1")
            .role(UserRole.USER)
            .build();
        userRepository.save(user1);

        User user2 = User.builder()
            .email("user2@demo.com")
            .passwordHash("$2a$10$dXJ3SW6G7P50eS3BQyHVkuJ5H3T4ECVL3WqcCi4UfJjHKf.0wUEIe")
            .name("사용자2")
            .nickname("사용자2")
            .role(UserRole.USER)
            .build();
        userRepository.save(user2);
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
        CampusBuilding lib = campusBuildingRepository.findAll().stream()
            .filter(b -> b.getBuildingName().equals("도서관"))
            .findFirst()
            .orElse(null);

        CampusBuilding adminBuilding = campusBuildingRepository.findAll().stream()
            .filter(b -> b.getBuildingName().equals("행정관"))
            .findFirst()
            .orElse(null);

        if (lib != null) {
            StorageLocation storage1 = StorageLocation.builder()
                .building(lib)
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
            storageLocationRepository.save(storage1);
        }

        if (adminBuilding != null) {
            StorageLocation storage2 = StorageLocation.builder()
                .building(adminBuilding)
                .storageName("행정관 분실물 보관소")
                .latitude(new BigDecimal("37.4989"))
                .longitude(new BigDecimal("126.9586"))
                .detailLocation("2층 종합상담실")
                .description("행정관 습득물 보관")
                .contactPhone("02-123-4568")
                .operatingHours("09:00 ~ 17:00")
                .pickupGuide("학생증 필수 지참")
                .active(true)
                .build();
            storageLocationRepository.save(storage2);
        }
    }

    private void initializeSearchSynonyms() {
        searchSynonymRepository.saveAll(java.util.List.of(
            SearchSynonym.builder().term("이어폰").canonical("이어폰").build(),
            SearchSynonym.builder().term("에어팟").canonical("이어폰").build(),
            SearchSynonym.builder().term("AirPods").canonical("이어폰").build(),
            SearchSynonym.builder().term("우산").canonical("우산").build(),
            SearchSynonym.builder().term("양산").canonical("우산").build(),
            SearchSynonym.builder().term("휴대폰").canonical("휴대폰").build(),
            SearchSynonym.builder().term("핸드폰").canonical("휴대폰").build(),
            SearchSynonym.builder().term("스마트폰").canonical("휴대폰").build()
        ));
    }

    private void initializeFoundItems() {
        User user1 = userRepository.findByEmail("user1@demo.com").orElse(null);
        Category pouch = categoryRepository.findByCategoryName("기타").orElse(null);
        Category umbrella = categoryRepository.findByCategoryName("우산").orElse(null);

        CampusBuilding lib = campusBuildingRepository.findAll().stream()
            .filter(b -> b.getBuildingName().equals("도서관"))
            .findFirst()
            .orElse(null);

        CampusBuilding adminBuilding = campusBuildingRepository.findAll().stream()
            .filter(b -> b.getBuildingName().equals("행정관"))
            .findFirst()
            .orElse(null);

        StorageLocation libStorage = storageLocationRepository.findAll().stream()
            .filter(s -> s.getStorageName().contains("도서관"))
            .findFirst()
            .orElse(null);

        StorageLocation adminStorage = storageLocationRepository.findAll().stream()
            .filter(s -> s.getStorageName().contains("행정관"))
            .findFirst()
            .orElse(null);

        if (user1 != null && pouch != null && lib != null && adminStorage != null) {
            FoundItem item1 = FoundItem.builder()
                .reporter(user1)
                .category(pouch)
                .foundBuilding(lib)
                .storage(adminStorage)
                .title("파란색 파우치")
                .description("지퍼가 있는 작은 파우치")
                .privateFeatures("내부에 이름 적혀있음")
                .foundDate(LocalDate.now().minusDays(2))
                .foundTime(LocalTime.of(14, 30))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("1층 열람실 테이블")
                .storageLocation("행정관 분실물 보관소")
                .storageLatitude(new BigDecimal("37.4989"))
                .storageLongitude(new BigDecimal("126.9586"))
                .storageLocationDetail("2층 종합상담실")
                .custodyType(CustodyType.HANDED_OVER)
                .status(FoundItemStatus.STORED)
                .build();
            foundItemRepository.save(item1);

            FoundItem item2 = FoundItem.builder()
                .reporter(user1)
                .category(pouch)
                .foundBuilding(lib)
                .title("남색 파우치")
                .description("검은색 지퍼가 있는 파우치")
                .foundDate(LocalDate.now().minusDays(1))
                .foundTime(LocalTime.of(10, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("지하 열람실")
                .custodyType(CustodyType.PENDING_HANDOVER)
                .status(FoundItemStatus.REPORTED)
                .build();
            foundItemRepository.save(item2);

            FoundItem item3 = FoundItem.builder()
                .reporter(user1)
                .category(pouch)
                .foundBuilding(lib)
                .title("파란색 필통")
                .description("펜이 여러 개 들어 있던 필통")
                .foundDate(LocalDate.now().minusDays(5))
                .foundTime(LocalTime.of(16, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("카페 근처")
                .custodyType(CustodyType.PENDING_HANDOVER)
                .status(FoundItemStatus.RETURNED)
                .build();
            foundItemRepository.save(item3);

            if (umbrella != null) {
                FoundItem item4 = FoundItem.builder()
                    .reporter(user1)
                    .category(umbrella)
                    .foundBuilding(adminBuilding)
                    .storage(adminStorage)
                    .title("검은색 우산")
                    .description("일반적인 접이식 우산")
                    .privateFeatures("손잡이가 약간 손상됨")
                    .foundDate(LocalDate.now())
                    .foundTime(LocalTime.of(13, 45))
                    .foundLocation("학생회관")
                    .foundLatitude(new BigDecimal("37.4984"))
                    .foundLongitude(new BigDecimal("126.9576"))
                    .foundLocationDetail("입구 근처")
                    .storageLocation("행정관 분실물 보관소")
                    .storageLatitude(new BigDecimal("37.4989"))
                    .storageLongitude(new BigDecimal("126.9586"))
                    .storageLocationDetail("2층 종합상담실")
                    .custodyType(CustodyType.HANDED_OVER)
                    .status(FoundItemStatus.STORED)
                    .build();
                foundItemRepository.save(item4);
            }
        }
    }
}
