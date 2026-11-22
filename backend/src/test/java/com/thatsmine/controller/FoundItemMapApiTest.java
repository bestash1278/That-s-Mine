package com.thatsmine.controller;

import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.Category;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.User;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.CampusBuildingRepository;
import com.thatsmine.repository.CategoryRepository;
import com.thatsmine.repository.FoundItemRepository;
import com.thatsmine.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 7단계: 지도 영역 검색 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("습득물 지도 API")
class FoundItemMapApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CampusBuildingRepository campusBuildingRepository;
    @Autowired private FoundItemRepository foundItemRepository;

    @BeforeEach
    void setUp() {
        User user = userRepository.save(User.builder()
                .email("map@test.local").passwordHash("x").nickname("지도").role(UserRole.USER).build());
        Category category = categoryRepository.save(Category.builder().categoryName("기타").sortOrder(6).build());
        CampusBuilding library = campusBuildingRepository.save(CampusBuilding.builder()
                .buildingName("도서관").latitude(new BigDecimal("37.4979000")).longitude(new BigDecimal("126.9566000")).build());

        // 좌표 없이 건물만 있는 물품 → 건물 좌표로 지도에 나와야 함
        foundItemRepository.save(item(user, category, library, "건물만 있는 물품", null, null, FoundItemStatus.STORED));
        // 정확한 좌표가 있는 물품
        foundItemRepository.save(item(user, category, library, "좌표 있는 물품",
                new BigDecimal("37.4980000"), new BigDecimal("126.9567000"), FoundItemStatus.REPORTED));
        // 영역 밖 물품
        foundItemRepository.save(item(user, category, null, "멀리 있는 물품",
                new BigDecimal("35.1000000"), new BigDecimal("129.0000000"), FoundItemStatus.STORED));
        // 숨김 물품
        foundItemRepository.save(item(user, category, library, "숨김 물품", null, null, FoundItemStatus.HIDDEN));
    }

    private FoundItem item(User user, Category category, CampusBuilding building, String title,
                           BigDecimal lat, BigDecimal lng, FoundItemStatus status) {
        return FoundItem.builder()
                .reporter(user).category(category).foundBuilding(building)
                .title(title).foundDate(LocalDate.now()).foundLocation(building != null ? building.getBuildingName() : "외부")
                .foundLatitude(lat).foundLongitude(lng)
                .custodyType(CustodyType.PENDING_HANDOVER).status(status)
                .build();
    }

    @Test
    @DisplayName("영역 안의 물품만, 좌표가 없으면 건물 좌표로 포함하고 숨김은 제외")
    void itemsInBounds() throws Exception {
        mockMvc.perform(get("/api/v1/found-items/map")
                        .param("minLat", "37.49").param("maxLat", "37.51")
                        .param("minLng", "126.95").param("maxLng", "126.97"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[?(@.title == '건물만 있는 물품')].markerApproximate").value(true))
                .andExpect(jsonPath("$.data[?(@.title == '건물만 있는 물품')].markerLatitude").value(37.4979))
                .andExpect(jsonPath("$.data[?(@.title == '좌표 있는 물품')].markerApproximate").value(false));
    }

    @Test
    @DisplayName("지도 검색에도 검색어 필터가 적용됨")
    void keywordFilter() throws Exception {
        mockMvc.perform(get("/api/v1/found-items/map")
                        .param("minLat", "37.49").param("maxLat", "37.51")
                        .param("minLng", "126.95").param("maxLng", "126.97")
                        .param("keyword", "좌표"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));
    }

    @Test
    @DisplayName("최소값이 최대값보다 큰 영역은 400")
    void invalidBounds() throws Exception {
        mockMvc.perform(get("/api/v1/found-items/map")
                        .param("minLat", "37.6").param("maxLat", "37.5")
                        .param("minLng", "126.95").param("maxLng", "126.97"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.bounds").exists());
    }

    @Test
    @DisplayName("위도 범위를 벗어나면 400")
    void outOfRange() throws Exception {
        mockMvc.perform(get("/api/v1/found-items/map")
                        .param("minLat", "-100").param("maxLat", "37.5")
                        .param("minLng", "126.95").param("maxLng", "126.97"))
                .andExpect(status().isBadRequest());
    }
}
