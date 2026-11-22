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
import java.time.LocalTime;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 조회 필터(SPEC §8, §27): 카테고리·발견 장소(건물)·날짜 범위·처리 상태·정렬, 그리고 삭제·숨김 제외.
 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("습득물 조회 필터 테스트")
class FoundItemSearchFilterTest {

    private static final LocalDate TODAY = LocalDate.now();

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private CampusBuildingRepository campusBuildingRepository;
    @Autowired
    private FoundItemRepository foundItemRepository;

    private Category electronics;
    private Category wallet;
    private CampusBuilding library;
    private CampusBuilding gym;
    private User reporter;
    private FoundItem earphone;
    private FoundItem card;
    private FoundItem oldWallet;

    @BeforeEach
    void setUp() {
        reporter = userRepository.save(User.builder().email("filter@test.local").passwordHash("x").nickname("신고자").role(UserRole.USER).build());
        electronics = categoryRepository.save(Category.builder().categoryName("전자기기").sortOrder(1).build());
        wallet = categoryRepository.save(Category.builder().categoryName("지갑·카드").sortOrder(2).build());
        library = campusBuildingRepository.save(CampusBuilding.builder().buildingName("도서관")
                .latitude(new BigDecimal("37.4979")).longitude(new BigDecimal("126.9566")).build());
        gym = campusBuildingRepository.save(CampusBuilding.builder().buildingName("체육관")
                .latitude(new BigDecimal("37.4990")).longitude(new BigDecimal("126.9580")).build());

        earphone = item("검은색 무선 이어폰", electronics, library, TODAY.minusDays(1), FoundItemStatus.STORED);
        card = item("갈색 카드지갑", wallet, gym, TODAY.minusDays(5), FoundItemStatus.STORED);
        oldWallet = item("오래된 지갑", wallet, library, TODAY.minusDays(30), FoundItemStatus.RETURNED);
    }

    private FoundItem item(String title, Category category, CampusBuilding building, LocalDate foundDate, FoundItemStatus status) {
        return foundItemRepository.save(FoundItem.builder().reporter(reporter).category(category).foundBuilding(building)
                .title(title).description(title + " 설명").foundDate(foundDate).foundTime(LocalTime.of(10, 0))
                .foundLocation(building.getBuildingName()).custodyType(CustodyType.PENDING_HANDOVER).status(status).build());
    }

    @Test
    @DisplayName("카테고리로 거른다")
    void categoryFilter() throws Exception {
        mockMvc.perform(get("/api/v1/found-items").param("categoryId", String.valueOf(wallet.getCategoryId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].title", containsInAnyOrder("갈색 카드지갑", "오래된 지갑")))
                .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    @DisplayName("발견 장소(건물)로 거른다")
    void buildingFilter() throws Exception {
        mockMvc.perform(get("/api/v1/found-items").param("buildingId", String.valueOf(gym.getBuildingId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].title", contains("갈색 카드지갑")));
    }

    @Test
    @DisplayName("발견 날짜 범위로 거른다(시작·끝 모두 포함)")
    void dateRangeFilter() throws Exception {
        mockMvc.perform(get("/api/v1/found-items")
                        .param("startDate", TODAY.minusDays(6).toString()).param("endDate", TODAY.minusDays(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].title", containsInAnyOrder("검은색 무선 이어폰", "갈색 카드지갑")));
        mockMvc.perform(get("/api/v1/found-items").param("startDate", TODAY.minusDays(1).toString()))
                .andExpect(jsonPath("$.data.content[*].title", contains("검은색 무선 이어폰")));
        mockMvc.perform(get("/api/v1/found-items").param("endDate", TODAY.minusDays(20).toString()))
                .andExpect(jsonPath("$.data.content[*].title", contains("오래된 지갑")));
    }

    @Test
    @DisplayName("처리 상태로 거른다")
    void statusFilter() throws Exception {
        mockMvc.perform(get("/api/v1/found-items").param("status", "RETURNED"))
                .andExpect(jsonPath("$.data.content[*].title", contains("오래된 지갑")));
    }

    @Test
    @DisplayName("여러 조건을 함께 적용한다(AND)")
    void combinedFilters() throws Exception {
        mockMvc.perform(get("/api/v1/found-items")
                        .param("categoryId", String.valueOf(wallet.getCategoryId()))
                        .param("buildingId", String.valueOf(library.getBuildingId()))
                        .param("keyword", "지갑"))
                .andExpect(jsonPath("$.data.content[*].title", contains("오래된 지갑")));
    }

    @Test
    @DisplayName("정렬: 최근 발견순·오래된 발견순")
    void sorting() throws Exception {
        mockMvc.perform(get("/api/v1/found-items").param("sort", "LATEST_FOUND"))
                .andExpect(jsonPath("$.data.content[0].title").value("검은색 무선 이어폰"))
                .andExpect(jsonPath("$.data.content[2].title").value("오래된 지갑"));
        mockMvc.perform(get("/api/v1/found-items").param("sort", "OLDEST_FOUND"))
                .andExpect(jsonPath("$.data.content[0].title").value("오래된 지갑"));
    }

    @Test
    @DisplayName("조건에 맞는 물품이 없으면 빈 목록과 0건")
    void noResults() throws Exception {
        mockMvc.perform(get("/api/v1/found-items").param("keyword", "존재하지않는물건"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(0)))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    @DisplayName("삭제된 물품은 목록·지도·최근·상세에서 제외된다")
    void softDeletedExcludedEverywhere() throws Exception {
        earphone.softDelete();
        foundItemRepository.saveAndFlush(earphone);
        mockMvc.perform(get("/api/v1/found-items"))
                .andExpect(jsonPath("$.data.content[*].title", containsInAnyOrder("갈색 카드지갑", "오래된 지갑")));
        mockMvc.perform(get("/api/v1/found-items/map").param("minLat", "37").param("maxLat", "38").param("minLng", "126").param("maxLng", "127"))
                .andExpect(jsonPath("$.data[*].title", containsInAnyOrder("갈색 카드지갑", "오래된 지갑")));
        mockMvc.perform(get("/api/v1/found-items/recent"))
                .andExpect(jsonPath("$.data.content[*].title", containsInAnyOrder("갈색 카드지갑", "오래된 지갑")));
        mockMvc.perform(get("/api/v1/found-items/" + earphone.getItemId())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("숨김 처리된 물품은 상태를 지정하지 않은 목록·지도·상세에서 제외된다")
    void hiddenExcluded() throws Exception {
        card.changeStatus(FoundItemStatus.HIDDEN);
        foundItemRepository.saveAndFlush(card);
        mockMvc.perform(get("/api/v1/found-items"))
                .andExpect(jsonPath("$.data.content[*].title", containsInAnyOrder("검은색 무선 이어폰", "오래된 지갑")));
        mockMvc.perform(get("/api/v1/found-items/map").param("minLat", "37").param("maxLat", "38").param("minLng", "126").param("maxLng", "127"))
                .andExpect(jsonPath("$.data[*].title", containsInAnyOrder("검은색 무선 이어폰", "오래된 지갑")));
        mockMvc.perform(get("/api/v1/found-items/" + card.getItemId())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("반환 완료 물품은 지도에서도 조회된다(회색 마커용, 상태 값 포함)")
    void returnedStillOnMap() throws Exception {
        mockMvc.perform(get("/api/v1/found-items/map").param("minLat", "37").param("maxLat", "38").param("minLng", "126").param("maxLng", "127")
                        .param("status", "RETURNED"))
                .andExpect(jsonPath("$.data[*].status", contains("RETURNED")));
    }
}
