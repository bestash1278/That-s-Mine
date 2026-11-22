package com.thatsmine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thatsmine.dto.UpdateFoundItemRequest;
import com.thatsmine.entity.*;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.*;
import com.thatsmine.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 9단계: 마이페이지 목록과 내 습득물 수정·삭제 제한 */
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@DisplayName("마이페이지 API")
class MyPageApiTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private CampusBuildingRepository campusBuildingRepository;
    @Autowired private FoundItemRepository foundItemRepository;
    @Autowired private ReturnRequestRepository returnRequestRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    private User finder;
    private User requester;
    private String finderBearer;
    private String requesterBearer;
    private Category clothing;
    private CampusBuilding studentCenter;

    @BeforeEach
    void setUp() {
        finder = userRepository.save(User.builder()
                .email("finder@test.local").passwordHash("x").nickname("습득자").role(UserRole.USER).build());
        requester = userRepository.save(User.builder()
                .email("requester@test.local").passwordHash("x").nickname("신청자").role(UserRole.USER).build());
        finderBearer = "Bearer " + jwtTokenProvider.createToken(finder);
        requesterBearer = "Bearer " + jwtTokenProvider.createToken(requester);
        clothing = categoryRepository.save(Category.builder().categoryName("의류·잡화").sortOrder(4).build());
        studentCenter = campusBuildingRepository.save(CampusBuilding.builder()
                .buildingName("학생회관").latitude(new BigDecimal("37.4984")).longitude(new BigDecimal("126.9578")).build());
    }

    private FoundItem saveItem(String title, FoundItemStatus status) {
        return foundItemRepository.save(FoundItem.builder()
                .reporter(finder).category(clothing).foundBuilding(studentCenter)
                .title(title).privateFeatures("손잡이 안쪽 흠집")
                .foundDate(LocalDate.now().minusDays(1)).foundLocation("학생회관")
                .custodyType(CustodyType.PENDING_HANDOVER).status(status).build());
    }

    private MockMultipartFile part(Object request) throws Exception {
        return new MockMultipartFile("request", "", "application/json", objectMapper.writeValueAsBytes(request));
    }

    private UpdateFoundItemRequest.UpdateFoundItemRequestBuilder edit(String title) {
        return UpdateFoundItemRequest.builder()
                .title(title).categoryId(clothing.getCategoryId())
                .foundDate(LocalDate.now().minusDays(1)).foundBuildingId(studentCenter.getBuildingId())
                .privateFeatures("손잡이 안쪽 흠집")
                .custodyType(CustodyType.PENDING_HANDOVER);
    }

    @Test
    @DisplayName("내 습득물 목록에 상태와 수정 제한 이유가 함께 옴 (숨김 물품도 본인에게는 보임)")
    void myFoundItems() throws Exception {
        saveItem("검은색 우산", FoundItemStatus.REPORTED);
        saveItem("은색 열쇠", FoundItemStatus.RETURN_PENDING);
        saveItem("숨긴 물품", FoundItemStatus.HIDDEN);

        mockMvc.perform(get("/api/v1/users/me/found-items").header("Authorization", finderBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(3)))
                .andExpect(jsonPath("$.data.content[?(@.title == '검은색 우산')].editable").value(true))
                .andExpect(jsonPath("$.data.content[?(@.title == '은색 열쇠')].editable").value(false))
                .andExpect(jsonPath("$.data.content[?(@.title == '은색 열쇠')].lockReason").exists());

        mockMvc.perform(get("/api/v1/users/me/found-items").header("Authorization", requesterBearer))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("수정 화면용 상세는 본인만(비공개 특징 포함), 다른 사람은 403")
    void myFoundItemDetailOwnerOnly() throws Exception {
        FoundItem item = saveItem("검은색 우산", FoundItemStatus.REPORTED);
        mockMvc.perform(get("/api/v1/users/me/found-items/" + item.getItemId()).header("Authorization", finderBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.privateFeatures").value("손잡이 안쪽 흠집"));
        mockMvc.perform(get("/api/v1/users/me/found-items/" + item.getItemId()).header("Authorization", requesterBearer))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("신고 접수 상태면 본인이 수정할 수 있음")
    void updateOwnItem() throws Exception {
        FoundItem item = saveItem("검은색 우산", FoundItemStatus.REPORTED);
        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/found-items/" + item.getItemId())
                        .file(part(edit("검은색 장우산").foundLocationDetail("정문 우산꽂이").build()))
                        .header("Authorization", finderBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("검은색 장우산"))
                .andExpect(jsonPath("$.data.foundLocationDetail").value("정문 우산꽂이"));
    }

    @Test
    @DisplayName("반환 진행 중인 물품은 수정·삭제 모두 409")
    void returnPendingLocked() throws Exception {
        FoundItem item = saveItem("은색 열쇠", FoundItemStatus.RETURN_PENDING);
        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/found-items/" + item.getItemId())
                        .file(part(edit("바꾼 이름").build())).header("Authorization", finderBearer))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("반환이 진행 중")));
        mockMvc.perform(delete("/api/v1/found-items/" + item.getItemId()).header("Authorization", finderBearer))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("처리 중인 반환 신청이 있으면 보관 중이어도 삭제 409, 신청이 반려되면 삭제 가능")
    void activeReturnRequestLocks() throws Exception {
        FoundItem item = saveItem("검은색 우산", FoundItemStatus.STORED);
        ReturnRequest request = returnRequestRepository.save(ReturnRequest.builder()
                .item(item).requester(requester).ownershipDescription("손잡이에 흠집").status(ReturnRequestStatus.PENDING).build());

        mockMvc.perform(delete("/api/v1/found-items/" + item.getItemId()).header("Authorization", finderBearer))
                .andExpect(status().isConflict());

        returnRequestRepository.delete(request);
        returnRequestRepository.save(ReturnRequest.builder()
                .item(item).requester(requester).ownershipDescription("손잡이에 흠집").status(ReturnRequestStatus.REJECTED).build());

        mockMvc.perform(delete("/api/v1/found-items/" + item.getItemId()).header("Authorization", finderBearer))
                .andExpect(status().isOk());
        assertThat(foundItemRepository.findById(item.getItemId())).get()
                .satisfies(found -> assertThat(found.getDeletedAt()).isNotNull());
        mockMvc.perform(get("/api/v1/found-items/" + item.getItemId())).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("다른 사람의 습득물은 수정·삭제 403")
    void otherUserForbidden() throws Exception {
        FoundItem item = saveItem("검은색 우산", FoundItemStatus.REPORTED);
        mockMvc.perform(multipart(HttpMethod.PATCH, "/api/v1/found-items/" + item.getItemId())
                        .file(part(edit("가로채기").build())).header("Authorization", requesterBearer))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/found-items/" + item.getItemId()).header("Authorization", requesterBearer))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("내 반환 신청 내역: 본인 신청만, 습득자의 비공개 특징은 없음")
    void myReturnRequests() throws Exception {
        FoundItem item = saveItem("검은색 우산", FoundItemStatus.STORED);
        returnRequestRepository.save(ReturnRequest.builder()
                .item(item).requester(requester).ownershipDescription("손잡이에 흠집").status(ReturnRequestStatus.PENDING).build());

        mockMvc.perform(get("/api/v1/users/me/return-requests").header("Authorization", requesterBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].itemTitle").value("검은색 우산"))
                .andExpect(jsonPath("$.data.content[0].statusLabel").value("신청 대기"))
                .andExpect(jsonPath("$.data.content[0].privateFeatures").doesNotExist());
        mockMvc.perform(get("/api/v1/users/me/return-requests").header("Authorization", finderBearer))
                .andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("비회원은 마이페이지 API를 쓸 수 없음(401)")
    void guestUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/users/me/found-items")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/users/me/lost-reports")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/users/me/return-requests")).andExpect(status().isUnauthorized());
    }
}
