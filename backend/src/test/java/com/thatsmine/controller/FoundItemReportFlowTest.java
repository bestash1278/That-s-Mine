package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.CreateFoundItemRequest;
import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.Category;
import com.thatsmine.entity.StorageLocation;
import com.thatsmine.entity.User;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.CampusBuildingRepository;
import com.thatsmine.repository.CategoryRepository;
import com.thatsmine.repository.StorageLocationRepository;
import com.thatsmine.repository.UserRepository;
import com.thatsmine.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 6단계: 습득물 신고 흐름과 신고 폼이 쓰는 기준 데이터 API */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("습득물 신고 흐름")
class FoundItemReportFlowTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CampusBuildingRepository campusBuildingRepository;
    @Autowired private StorageLocationRepository storageLocationRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String bearer;

    private Category clothing;
    private CampusBuilding studentCenter;
    private StorageLocation office;

    @BeforeEach
    void setUp() {
        User reporter = userRepository.save(User.builder()
                .email("reporter@test.local").passwordHash("x").nickname("신고자").role(UserRole.USER).build());
        bearer = "Bearer " + jwtTokenProvider.createToken(reporter);
        clothing = categoryRepository.save(Category.builder().categoryName("의류·잡화").sortOrder(4).build());
        studentCenter = campusBuildingRepository.save(CampusBuilding.builder()
                .buildingName("학생회관").latitude(new BigDecimal("37.4984")).longitude(new BigDecimal("126.9578")).build());
        office = storageLocationRepository.save(StorageLocation.builder()
                .building(studentCenter).storageName("학생회관 관리실")
                .latitude(new BigDecimal("37.4984")).longitude(new BigDecimal("126.9578"))
                .detailLocation("1층").operatingHours("평일 09:00~18:00").active(true).build());
    }

    private MockMultipartFile requestPart(CreateFoundItemRequest request) throws Exception {
        return new MockMultipartFile("request", "", "application/json", objectMapper.writeValueAsBytes(request));
    }

    @Test
    @DisplayName("과업 B: 학생회관에서 주운 검은색 우산을 건물 선택만으로 신고")
    void reportUmbrellaWithBuildingOnly() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("검은색 우산")
                .description("검은색 장우산, 나무 손잡이")
                .categoryId(clothing.getCategoryId())
                .foundDate(LocalDate.now())
                .foundBuildingId(studentCenter.getBuildingId())
                .foundLocationDetail("1층 정문 우산꽂이")
                .custodyType(CustodyType.PENDING_HANDOVER)
                .build();

        mockMvc.perform(multipart("/api/v1/found-items").file(requestPart(request)).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.itemId").isNumber())
                .andExpect(jsonPath("$.data.foundLocation").value("학생회관"))
                .andExpect(jsonPath("$.data.foundBuildingName").value("학생회관"))
                .andExpect(jsonPath("$.data.storageStatusLabel").value("보관 장소 확인 중"))
                .andExpect(jsonPath("$.data.foundLatitude").value(nullValue()));
    }

    @Test
    @DisplayName("관리 부서에 전달 완료 + 공식 보관 장소 선택 시 보관 위치가 저장됨")
    void reportHandedOverWithOfficialStorage() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("검은색 우산")
                .categoryId(clothing.getCategoryId())
                .foundDate(LocalDate.now())
                .foundBuildingId(studentCenter.getBuildingId())
                .custodyType(CustodyType.HANDED_OVER)
                .storageId(office.getStorageId())
                .build();

        mockMvc.perform(multipart("/api/v1/found-items").file(requestPart(request)).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storageName").value("학생회관 관리실"))
                .andExpect(jsonPath("$.data.storageInfo.operatingHours").value("평일 09:00~18:00"));
    }

    @Test
    @DisplayName("필수 항목이 빠지면 400과 항목별 오류를 돌려줌")
    void missingRequiredFields() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .foundDate(LocalDate.now().plusDays(1))
                .custodyType(CustodyType.HANDED_OVER)
                .build();

        mockMvc.perform(multipart("/api/v1/found-items").file(requestPart(request)).header("Authorization", bearer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.categoryId").exists())
                .andExpect(jsonPath("$.fieldErrors.foundDate").exists())
                .andExpect(jsonPath("$.fieldErrors.foundLocation").exists())
                .andExpect(jsonPath("$.fieldErrors.storageId").exists());
    }

    @Test
    @DisplayName("확장자만 jpg인 텍스트 파일은 거부")
    void fakeImageRejected() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("검은색 우산").categoryId(clothing.getCategoryId()).foundDate(LocalDate.now())
                .foundBuildingId(studentCenter.getBuildingId()).custodyType(CustodyType.PENDING_HANDOVER).build();
        MockMultipartFile fake = new MockMultipartFile("images", "photo.jpg", "image/jpeg", "not an image".getBytes());

        mockMvc.perform(multipart("/api/v1/found-items").file(requestPart(request)).file(fake).header("Authorization", bearer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.images").exists());
    }

    @Test
    @DisplayName("사진 4장은 거부")
    void tooManyImages() throws Exception {
        CreateFoundItemRequest request = CreateFoundItemRequest.builder()
                .title("검은색 우산").categoryId(clothing.getCategoryId()).foundDate(LocalDate.now())
                .foundBuildingId(studentCenter.getBuildingId()).custodyType(CustodyType.PENDING_HANDOVER).build();
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};

        var builder = multipart("/api/v1/found-items").file(requestPart(request));
        builder.header("Authorization", bearer);
        for (int i = 0; i < 4; i++) {
            builder.file(new MockMultipartFile("images", "p" + i + ".jpg", "image/jpeg", jpeg));
        }
        mockMvc.perform(builder)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.images").exists());
    }

    @Test
    @DisplayName("기준 데이터 API: 카테고리, 건물, 보관 장소")
    void referenceData() throws Exception {
        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].categoryName").value("의류·잡화"));
        mockMvc.perform(get("/api/v1/campus-buildings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));
        mockMvc.perform(get("/api/v1/storage-locations").param("buildingId", String.valueOf(studentCenter.getBuildingId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].storageName").value("학생회관 관리실"));
    }

    @Test
    @DisplayName("없는 습득물 상세는 404")
    void notFound() throws Exception {
        mockMvc.perform(get("/api/v1/found-items/999999"))
                .andExpect(status().isNotFound());
    }
}
