package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.*;
import com.thatsmine.entity.*;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.*;
import com.thatsmine.security.JwtTokenProvider;
import com.thatsmine.service.FoundItemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("습득물 API 테스트")
class FoundItemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CampusBuildingRepository campusBuildingRepository;

    @Autowired
    private StorageLocationRepository storageLocationRepository;

    @Autowired
    private FoundItemRepository foundItemRepository;

    @Autowired
    private FoundItemImageRepository foundItemImageRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;

    private String bearer() {
        return "Bearer " + jwtTokenProvider.createToken(testUser);
    }
    private Category testCategory;
    private CampusBuilding testBuilding;
    private StorageLocation testStorage;

    @BeforeEach
    void setup() {
        testUser = User.builder()
                .email("test@example.com")
                .passwordHash("hash")
                .nickname("테스터")
                .role(UserRole.USER)
                .build();
        userRepository.save(testUser);

        testCategory = Category.builder()
                .categoryName("테스트 카테고리")
                .sortOrder(1)
                .build();
        categoryRepository.save(testCategory);

        testBuilding = CampusBuilding.builder()
                .buildingName("테스트 건물")
                .latitude(new BigDecimal("37.4979"))
                .longitude(new BigDecimal("126.9566"))
                .description("테스트")
                .build();
        campusBuildingRepository.save(testBuilding);

        testStorage = StorageLocation.builder()
                .building(testBuilding)
                .storageName("테스트 보관소")
                .latitude(new BigDecimal("37.4979"))
                .longitude(new BigDecimal("126.9566"))
                .detailLocation("1층")
                .contactPhone("02-1234-5678")
                .operatingHours("09:00~18:00")
                .pickupGuide("신분증 필수")
                .active(true)
                .build();
        storageLocationRepository.save(testStorage);
    }

    @Test
    @DisplayName("검색 - 키워드로 습득물 조회")
    void searchByKeyword() throws Exception {
        FoundItem item = FoundItem.builder()
                .reporter(testUser)
                .category(testCategory)
                .foundBuilding(testBuilding)
                .title("파란색 파우치")
                .description("지퍼가 있는 파우치")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("열람실")
                .custodyType(CustodyType.PENDING_HANDOVER)
                .status(FoundItemStatus.REPORTED)
                .build();
        foundItemRepository.save(item);

        mockMvc.perform(get("/api/v1/found-items")
                .param("keyword", "파란색")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].title").value("파란색 파우치"));
    }

    @Test
    @DisplayName("검색 - 개인 특징은 검색에서 제외")
    void searchDoesNotIncludePrivateFeatures() throws Exception {
        FoundItem item = FoundItem.builder()
                .reporter(testUser)
                .category(testCategory)
                .foundBuilding(testBuilding)
                .title("테스트 물품")
                .description("일반 설명")
                .privateFeatures("소유자만 알 수 있는 특징")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("열람실")
                .custodyType(CustodyType.PENDING_HANDOVER)
                .status(FoundItemStatus.REPORTED)
                .build();
        foundItemRepository.save(item);

        mockMvc.perform(get("/api/v1/found-items")
                .param("keyword", "소유자만")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("상세 조회 - 공개 DTO에 private_features 없음")
    void detailResponseDoesNotContainPrivateFeatures() throws Exception {
        FoundItem item = FoundItem.builder()
                .reporter(testUser)
                .category(testCategory)
                .foundBuilding(testBuilding)
                .storage(testStorage)
                .title("테스트 파우치")
                .description("일반 설명")
                .privateFeatures("비공개 특징")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("열람실")
                .storageLocation("테스트 보관소")
                .storageLatitude(new BigDecimal("37.4979"))
                .storageLongitude(new BigDecimal("126.9566"))
                .storageLocationDetail("1층")
                .custodyType(CustodyType.HANDED_OVER)
                .status(FoundItemStatus.STORED)
                .build();
        FoundItem savedItem = foundItemRepository.save(item);

        MvcResult result = mockMvc.perform(get("/api/v1/found-items/" + savedItem.getItemId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        assert !responseBody.contains("privateFeatures");
    }

    @Test
    @DisplayName("상세 조회 - 보관 위치 정보 포함")
    void detailResponseContainsStorageInfo() throws Exception {
        FoundItem item = FoundItem.builder()
                .reporter(testUser)
                .category(testCategory)
                .foundBuilding(testBuilding)
                .storage(testStorage)
                .title("테스트 물품")
                .description("설명")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("열람실")
                .storageLocation("테스트 보관소")
                .storageLatitude(new BigDecimal("37.4979"))
                .storageLongitude(new BigDecimal("126.9566"))
                .storageLocationDetail("1층")
                .custodyType(CustodyType.HANDED_OVER)
                .status(FoundItemStatus.STORED)
                .build();
        FoundItem savedItem = foundItemRepository.save(item);

        mockMvc.perform(get("/api/v1/found-items/" + savedItem.getItemId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storageInfo").exists())
                .andExpect(jsonPath("$.data.storageInfo.contactPhone").value("02-1234-5678"))
                .andExpect(jsonPath("$.data.storageInfo.operatingHours").value("09:00~18:00"))
                .andExpect(jsonPath("$.data.storageInfo.pickupGuide").value("신분증 필수"));
    }

    @Test
    @DisplayName("신고 - 미래 날짜 거부")
    void createRejectsFutureDate() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("테스트 물품")
                .description("설명")
                .categoryId(testCategory.getCategoryId())
                .foundDate(LocalDate.now().plusDays(1))
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundBuildingId(testBuilding.getBuildingId())
                .custodyType(CustodyType.PENDING_HANDOVER)
                .build();

        mockMvc.perform(multipart("/api/v1/found-items")
                .file(new MockMultipartFile("request", "", "application/json", objectMapper.writeValueAsBytes(request)))
                .header("Authorization", bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.foundDate").exists());
    }

    @Test
    @DisplayName("신고 - 좌표 범위 검증")
    void createValidatesCoordinates() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("테스트 물품")
                .description("설명")
                .categoryId(testCategory.getCategoryId())
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("91"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundBuildingId(testBuilding.getBuildingId())
                .custodyType(CustodyType.PENDING_HANDOVER)
                .build();

        mockMvc.perform(multipart("/api/v1/found-items")
                .file(new MockMultipartFile("request", "", "application/json", objectMapper.writeValueAsBytes(request)))
                .header("Authorization", bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.foundCoordinates").exists());
    }

    @Test
    @DisplayName("신고 - 이미지 처리")
    void createWithImages() throws Exception {
        byte[] imageContent = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};

        MockMultipartFile imageFile = new MockMultipartFile(
                "images",
                "test.jpg",
                "image/jpeg",
                imageContent);

        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("테스트 물품")
                .description("설명")
                .categoryId(testCategory.getCategoryId())
                .foundDate(LocalDate.now().minusDays(1)) // 오늘+14시는 오전에 실행하면 '미래 시각'이 된다
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundBuildingId(testBuilding.getBuildingId())
                .custodyType(CustodyType.PENDING_HANDOVER)
                .representativeImageIndex(0)
                .build();

        MockMultipartFile requestFile = new MockMultipartFile(
                "request",
                "",
                "application/json",
                objectMapper.writeValueAsBytes(request));

        mockMvc.perform(multipart("/api/v1/found-items")
                .file(imageFile)
                .file(requestFile)
                .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"));
    }

    @Test
    @DisplayName("목록 - 보관 상태 라벨 표시")
    void listIncludesStorageStatusLabel() throws Exception {
        FoundItem item1 = FoundItem.builder()
                .reporter(testUser)
                .category(testCategory)
                .foundBuilding(testBuilding)
                .title("신고 중인 물품")
                .description("설명")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("열람실")
                .custodyType(CustodyType.PENDING_HANDOVER)
                .status(FoundItemStatus.REPORTED)
                .build();
        foundItemRepository.save(item1);

        FoundItem item2 = FoundItem.builder()
                .reporter(testUser)
                .category(testCategory)
                .foundBuilding(testBuilding)
                .storage(testStorage)
                .title("보관 중인 물품")
                .description("설명")
                .foundDate(LocalDate.now())
                .foundTime(LocalTime.of(14, 0))
                .foundLocation("도서관")
                .foundLatitude(new BigDecimal("37.4979"))
                .foundLongitude(new BigDecimal("126.9566"))
                .foundLocationDetail("열람실")
                .storageLocation("테스트 보관소")
                .storageLatitude(new BigDecimal("37.4979"))
                .storageLongitude(new BigDecimal("126.9566"))
                .storageLocationDetail("1층")
                .custodyType(CustodyType.HANDED_OVER)
                .status(FoundItemStatus.STORED)
                .build();
        foundItemRepository.save(item2);

        mockMvc.perform(get("/api/v1/found-items")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[1].storageStatusLabel").value("보관 장소 확인 중"))
                .andExpect(jsonPath("$.data.content[0].storageStatusLabel").value("테스트 보관소"));
    }
}
