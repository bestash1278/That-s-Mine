package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.lost.LostReportRequest;
import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.Category;
import com.thatsmine.entity.User;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.CampusBuildingRepository;
import com.thatsmine.repository.CategoryRepository;
import com.thatsmine.repository.LostReportRepository;
import com.thatsmine.repository.UserRepository;
import com.thatsmine.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 9단계: 분실 신고 등록·조회·지도·수정·상태 변경·삭제 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("분실 신고 API")
class LostReportApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CampusBuildingRepository campusBuildingRepository;
    @Autowired private LostReportRepository lostReportRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private String ownerBearer;
    private String otherBearer;
    private Category clothing;
    private CampusBuilding library;

    @BeforeEach
    void setUp() {
        User owner = userRepository.save(User.builder()
                .email("owner@test.local").passwordHash("x").nickname("분실자").role(UserRole.USER).build());
        User other = userRepository.save(User.builder()
                .email("other@test.local").passwordHash("x").nickname("다른사람").role(UserRole.USER).build());
        ownerBearer = "Bearer " + jwtTokenProvider.createToken(owner);
        otherBearer = "Bearer " + jwtTokenProvider.createToken(other);
        clothing = categoryRepository.save(Category.builder().categoryName("의류·잡화").sortOrder(4).build());
        library = campusBuildingRepository.save(CampusBuilding.builder()
                .buildingName("도서관").latitude(new BigDecimal("37.4979")).longitude(new BigDecimal("126.9566")).build());
    }

    private LostReportRequest.LostReportRequestBuilder pouch() {
        return LostReportRequest.builder()
                .title("파란색 파우치")
                .description("손바닥 크기, 지퍼 있음")
                .categoryId(clothing.getCategoryId())
                .lostDate(LocalDate.now().minusDays(3))
                .lostEndDate(LocalDate.now().minusDays(1))
                .lostBuildingId(library.getBuildingId())
                .lostLocationDetail("3층 열람실이나 1층 로비 중 한 곳");
    }

    private MockMultipartFile part(Object request) throws Exception {
        return new MockMultipartFile("request", "", "application/json", objectMapper.writeValueAsBytes(request));
    }

    private long create(LostReportRequest request) throws Exception {
        String body = mockMvc.perform(multipart("/api/v1/lost-reports").file(part(request)).header("Authorization", ownerBearer))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).at("/data/reportId").asLong();
    }

    @Test
    @DisplayName("기간 + 대표 건물 + 추가 설명으로 등록하면 접수 번호를 받음")
    void createWithPeriod() throws Exception {
        mockMvc.perform(multipart("/api/v1/lost-reports").file(part(pouch().build())).header("Authorization", ownerBearer))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.receiptNo").value(org.hamcrest.Matchers.matchesPattern("LR-\\d{6}")))
                .andExpect(jsonPath("$.data.lostLocation").value("도서관"))
                .andExpect(jsonPath("$.data.lostLocationDetail").value("3층 열람실이나 1층 로비 중 한 곳"))
                .andExpect(jsonPath("$.data.status").value("SEARCHING"))
                .andExpect(jsonPath("$.data.markerApproximate").value(true))
                .andExpect(jsonPath("$.data.mine").value(true));
    }

    @Test
    @DisplayName("비회원은 등록할 수 없음(401)")
    void guestCannotCreate() throws Exception {
        mockMvc.perform(multipart("/api/v1/lost-reports").file(part(pouch().build())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("미래 날짜, 거꾸로 된 기간, 위치 없음은 항목별 오류")
    void validation() throws Exception {
        LostReportRequest future = pouch().lostDate(LocalDate.now().plusDays(1)).lostEndDate(null).build();
        mockMvc.perform(multipart("/api/v1/lost-reports").file(part(future)).header("Authorization", ownerBearer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.lostDate").exists());

        LostReportRequest reversed = pouch().lostDate(LocalDate.now().minusDays(1)).lostEndDate(LocalDate.now().minusDays(3))
                .lostBuildingId(null).build();
        mockMvc.perform(multipart("/api/v1/lost-reports").file(part(reversed)).header("Authorization", ownerBearer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.lostEndDate").exists())
                .andExpect(jsonPath("$.fieldErrors.lostLocation").exists());
    }

    @Test
    @DisplayName("비회원 상세 조회에는 신고자 정보와 수정 권한 정보가 없음")
    void guestDetail() throws Exception {
        long id = create(pouch().build());
        mockMvc.perform(get("/api/v1/lost-reports/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("파란색 파우치"))
                .andExpect(jsonPath("$.data.mine").value(false))
                .andExpect(jsonPath("$.data.contentEditable").doesNotExist())
                .andExpect(jsonPath("$.data.user").doesNotExist())
                .andExpect(jsonPath("$.data.nickname").doesNotExist());
    }

    @Test
    @DisplayName("지도 조회: 지점을 찍지 않은 신고도 대표 건물 위치로 영역 검색에 포함")
    void mapUsesBuildingCoordinates() throws Exception {
        create(pouch().build());
        mockMvc.perform(get("/api/v1/lost-reports/map")
                        .param("minLat", "37.49").param("maxLat", "37.51")
                        .param("minLng", "126.95").param("maxLng", "126.96"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].markerLatitude").value(37.4979));

        mockMvc.perform(get("/api/v1/lost-reports/map")
                        .param("minLat", "35.0").param("maxLat", "35.1")
                        .param("minLng", "129.0").param("maxLng", "129.1"))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("목록의 날짜 조건은 분실 추정 기간과 겹치는지로 판단")
    void listDateOverlap() throws Exception {
        create(pouch().build()); // 3일 전 ~ 1일 전
        mockMvc.perform(get("/api/v1/lost-reports").param("startDate", LocalDate.now().minusDays(2).toString()))
                .andExpect(jsonPath("$.data.content", hasSize(1)));
        mockMvc.perform(get("/api/v1/lost-reports").param("startDate", LocalDate.now().toString()))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("다른 사람은 수정·삭제할 수 없음(403)")
    void otherUserForbidden() throws Exception {
        long id = create(pouch().build());
        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/lost-reports/" + id)
                        .file(part(pouch().title("바꾼 제목").build())).header("Authorization", otherBearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/lost-reports/" + id).header("Authorization", otherBearer))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("본인은 수정 가능, '찾기 완료'로 바꾼 뒤에는 내용 수정이 409")
    void ownerUpdateThenLock() throws Exception {
        long id = create(pouch().build());
        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/lost-reports/" + id)
                        .file(part(pouch().title("남색 파우치").build())).header("Authorization", ownerBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("남색 파우치"));

        mockMvc.perform(patch("/api/v1/lost-reports/" + id + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "FOUND")))
                        .header("Authorization", ownerBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("FOUND"))
                .andExpect(jsonPath("$.data.contentEditable").value(false));

        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/lost-reports/" + id)
                        .file(part(pouch().title("또 바꿈").build())).header("Authorization", ownerBearer))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("삭제는 Soft Delete: 행은 남고 조회·내 목록·지도에서 빠짐")
    void softDelete() throws Exception {
        long id = create(pouch().build());
        mockMvc.perform(delete("/api/v1/lost-reports/" + id).header("Authorization", ownerBearer))
                .andExpect(status().isOk());

        assertThat(lostReportRepository.findById(id)).get().satisfies(r -> assertThat(r.getDeletedAt()).isNotNull());
        mockMvc.perform(get("/api/v1/lost-reports/" + id)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/users/me/lost-reports").header("Authorization", ownerBearer))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
        mockMvc.perform(get("/api/v1/lost-reports/map")
                        .param("minLat", "37.49").param("maxLat", "37.51")
                        .param("minLng", "126.95").param("maxLng", "126.96"))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    @DisplayName("내 분실 신고 목록에는 상태와 수정 가능 여부가 함께 옴")
    void myList() throws Exception {
        create(pouch().build());
        mockMvc.perform(get("/api/v1/users/me/lost-reports").header("Authorization", ownerBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].statusLabel").value("찾는 중"))
                .andExpect(jsonPath("$.data.content[0].contentEditable").value(true))
                .andExpect(jsonPath("$.data.content[0].deletable").value(true));
        mockMvc.perform(get("/api/v1/users/me/lost-reports").header("Authorization", otherBearer))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("수정 시 keepImageUrls에 없는 사진 URL을 넣으면 거부")
    void foreignImageUrlRejected() throws Exception {
        long id = create(pouch().build());
        LostReportRequest request = pouch().keepImageUrls(List.of("/uploads/someone-else.jpg")).build();
        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/lost-reports/" + id)
                        .file(part(request)).header("Authorization", ownerBearer))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.images").exists());
    }

    @Test
    @DisplayName("같은 내용의 분실 신고를 곧바로 다시 보내면 서버가 막는다(409)")
    void duplicateSubmissionRejected() throws Exception {
        create(pouch().build());
        mockMvc.perform(multipart("/api/v1/lost-reports").file(part(pouch().build())).header("Authorization", ownerBearer))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("같은 내용의 분실 신고가 방금 접수")));
        // 다른 사용자는 같은 내용도 접수할 수 있다
        mockMvc.perform(multipart("/api/v1/lost-reports").file(part(pouch().build())).header("Authorization", otherBearer))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("관리자는 남의 분실 신고 상태를 바꿀 수 있고(내용은 그대로), 일반 사용자는 관리자 API를 못 쓴다")
    void adminChangesStatus() throws Exception {
        long id = create(pouch().build());
        User admin = userRepository.save(User.builder().email("admin@test.local").passwordHash("x").nickname("관리자").role(UserRole.ADMIN).build());
        String adminBearer = "Bearer " + jwtTokenProvider.createToken(admin);

        mockMvc.perform(patch("/api/v1/admin/lost-reports/" + id + "/status").header("Authorization", otherBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/admin/lost-reports/" + id + "/status").header("Authorization", adminBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"))
                .andExpect(jsonPath("$.data.title").value("파란색 파우치"));
        mockMvc.perform(patch("/api/v1/admin/lost-reports/" + id + "/status").header("Authorization", adminBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isConflict());
        mockMvc.perform(patch("/api/v1/admin/lost-reports/" + id + "/status").header("Authorization", adminBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"NOPE\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/v1/admin/lost-reports/999999/status").header("Authorization", adminBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"FOUND\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/api/v1/admin/lost-reports/" + id + "/status").header("Authorization", adminBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"SEARCHING\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SEARCHING"));
    }
}
