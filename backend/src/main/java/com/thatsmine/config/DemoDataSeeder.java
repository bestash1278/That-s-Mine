package com.thatsmine.config;

import com.thatsmine.entity.*;
import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.LostReportStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import com.thatsmine.enums.UserRole;
import com.thatsmine.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 개발·사용성 테스트용 시연 데이터 (dev 프로필 전용).
 *
 * - 건물 좌표, 보관 장소, 연락처는 모두 시연용 가상 값이다. 실제 캠퍼스 정보가 아니다.
 * - 실제 개인정보는 넣지 않는다.
 * - 과업 A(도서관에서 잃어버린 파란색 파우치 찾기)를 위해 정답 1개와 비슷한 오답 후보를 둔다.
 *   정답은 "발견: 도서관 / 보관: 행정관 학생지원팀"으로 발견 장소와 보관 장소가 다르다.
 * - 과업 B(학생회관에서 주운 검은색 우산 신고)를 위해 학생회관 건물과 의류·잡화 카테고리를 둔다.
 * - 카테고리와 검색 동의어는 Flyway(V1, V2)가 넣는다.
 */
@Component
@Profile({"dev", "demo"})
@RequiredArgsConstructor
public class DemoDataSeeder {

    public static final String ADMIN_EMAIL = "admin@demo.local";
    public static final String USER1_EMAIL = "user1@demo.local";
    public static final String USER2_EMAIL = "user2@demo.local";

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CampusBuildingRepository campusBuildingRepository;
    private final StorageLocationRepository storageLocationRepository;
    private final FoundItemRepository foundItemRepository;
    private final LostReportRepository lostReportRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${demo.account-password:demo1234!}")
    private String demoPassword;

    public boolean isSeeded() {
        return userRepository.findByEmail(ADMIN_EMAIL).isPresent();
    }

    /** 사용자, 건물, 보관 장소, 습득물을 만든다. 호출 전에 기존 데이터가 비어 있어야 한다. */
    public void seedAll() {
        Map<String, User> users = seedUsers();
        Map<String, CampusBuilding> buildings = seedBuildings();
        Map<String, StorageLocation> storages = seedStorageLocations(buildings);
        Map<String, FoundItem> items = seedFoundItems(users.get(USER1_EMAIL), buildings, storages);
        seedLostReports(users, buildings);
        seedReturnRequests(users, items);
    }

    // ------------------------------------------------------------------ 사용자

    private Map<String, User> seedUsers() {
        Map<String, User> users = new HashMap<>();
        users.put(ADMIN_EMAIL, saveUser(ADMIN_EMAIL, "관리자", UserRole.ADMIN));
        users.put(USER1_EMAIL, saveUser(USER1_EMAIL, "시연사용자1", UserRole.USER));
        users.put(USER2_EMAIL, saveUser(USER2_EMAIL, "시연사용자2", UserRole.USER));
        return users;
    }

    private User saveUser(String email, String nickname, UserRole role) {
        return userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(demoPassword))
                .nickname(nickname)
                .role(role)
                .build());
    }

    // ------------------------------------------------------------------ 건물·보관 장소

    private Map<String, CampusBuilding> seedBuildings() {
        Map<String, CampusBuilding> map = new HashMap<>();
        map.put("도서관", saveBuilding("도서관", "37.4979000", "126.9566000"));
        map.put("학생회관", saveBuilding("학생회관", "37.4984000", "126.9578000"));
        map.put("행정관", saveBuilding("행정관", "37.4990000", "126.9588000"));
        map.put("공학관", saveBuilding("공학관", "37.4972000", "126.9580000"));
        map.put("인문관", saveBuilding("인문관", "37.4986000", "126.9555000"));
        map.put("체육관", saveBuilding("체육관", "37.4966000", "126.9560000"));
        return map;
    }

    private CampusBuilding saveBuilding(String name, String lat, String lng) {
        return campusBuildingRepository.save(CampusBuilding.builder()
                .buildingName(name)
                .latitude(new BigDecimal(lat))
                .longitude(new BigDecimal(lng))
                .description("시연용 건물 데이터 (실제 좌표 아님)")
                .build());
    }

    private Map<String, StorageLocation> seedStorageLocations(Map<String, CampusBuilding> b) {
        Map<String, StorageLocation> map = new HashMap<>();
        map.put("학생지원팀", saveStorage(b.get("행정관"), "학생지원팀 분실물 보관함",
                "37.4990500", "126.9588500", "행정관 1층 학생지원팀 사무실",
                "000-0000-0000 (시연용)", "평일 09:00~18:00 (점심 12:00~13:00 제외)",
                "학생증 또는 신분증을 가져와 주세요. 담당자가 소유 여부를 확인한 뒤 돌려드립니다."));
        map.put("도서관", saveStorage(b.get("도서관"), "도서관 안내데스크",
                "37.4979300", "126.9566400", "도서관 1층 정문 안내데스크",
                "000-0000-0001 (시연용)", "평일 09:00~21:00, 주말 10:00~17:00",
                "안내데스크에 물품명을 말하고 학생증을 보여 주세요."));
        map.put("학생회관", saveStorage(b.get("학생회관"), "학생회관 관리실",
                "37.4984300", "126.9578300", "학생회관 1층 관리실",
                "000-0000-0002 (시연용)", "평일 09:00~18:00",
                "관리실 직원에게 문의해 주세요. 신분 확인 후 수령할 수 있습니다."));
        return map;
    }

    private StorageLocation saveStorage(CampusBuilding building, String name, String lat, String lng,
                                        String detail, String phone, String hours, String guide) {
        return storageLocationRepository.save(StorageLocation.builder()
                .building(building)
                .storageName(name)
                .latitude(new BigDecimal(lat))
                .longitude(new BigDecimal(lng))
                .detailLocation(detail)
                .description("시연용 보관 장소")
                .contactPhone(phone)
                .operatingHours(hours)
                .pickupGuide(guide)
                .active(true)
                .build());
    }

    // ------------------------------------------------------------------ 습득물

    private Map<String, FoundItem> seedFoundItems(User reporter, Map<String, CampusBuilding> b, Map<String, StorageLocation> s) {
        Map<String, FoundItem> saved = new HashMap<>();
        Category electronics = category("전자기기");
        Category wallet = category("지갑·카드");
        Category key = category("열쇠");
        Category clothing = category("의류·잡화");
        Category stationery = category("도서·문구");
        Category etc = category("기타");

        // ---- 과업 A 정답 세트 1: 파란색 파우치 (발견 도서관 → 보관 행정관 학생지원팀)
        item(reporter, clothing, "파란색 파우치", "지퍼가 달린 손바닥 크기의 파란색 천 파우치",
                "안쪽 작은 주머니에 노란색 스티커가 붙어 있음",
                2, LocalTime.of(15, 20), b.get("도서관"), "3층 제2열람실 창가 자리",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생지원팀"));
        // 오답 후보: 색이 비슷한 파우치(보관 장소 미확정)
        item(reporter, clothing, "남색 파우치", "검은색 지퍼가 달린 남색 파우치, 펜 몇 자루가 들어 있음",
                null, 1, LocalTime.of(10, 5), b.get("도서관"), "1층 로비 의자",
                CustodyType.PENDING_HANDOVER, FoundItemStatus.REPORTED, null);
        // 오답 후보: 같은 장소·같은 색의 다른 물건
        item(reporter, stationery, "파란색 필통", "반투명 파란색 플라스틱 필통",
                null, 3, LocalTime.of(17, 40), b.get("도서관"), "2층 노트북 열람실",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("도서관"));
        // 오답 후보: 같은 이름이지만 이미 반환된 물건
        item(reporter, clothing, "파란색 파우치", "작은 파란색 화장품 파우치",
                null, 20, LocalTime.of(12, 0), b.get("학생회관"), "2층 식당",
                CustodyType.HANDED_OVER, FoundItemStatus.RETURNED, s.get("학생회관"));

        // ---- 과업 A 정답 세트 2: 회색 가방 (발견 공학관 → 보관 행정관 학생지원팀)
        item(reporter, clothing, "회색 가방", "회색 백팩, 앞주머니에 우산 고리가 있음",
                "노트북 칸에 물리학 교재가 들어 있음",
                1, LocalTime.of(18, 10), b.get("공학관"), "2층 201호 강의실 뒷줄",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생지원팀"));
        item(reporter, clothing, "회색 에코백", "회색 천 에코백, 로고 없음",
                null, 4, LocalTime.of(13, 30), b.get("인문관"), "1층 휴게실",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생회관"));

        // ---- SPEC §25 시연 물품 (여러 상태 포함)
        item(reporter, electronics, "검은색 무선 이어폰", "검은색 무선 이어폰 충전 케이스",
                "케이스 뒷면에 작은 흠집", 0, LocalTime.of(9, 30), b.get("공학관"), "1층 엘리베이터 앞",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생지원팀"));
        item(reporter, wallet, "갈색 카드지갑", "갈색 가죽 카드지갑, 카드 칸 4개",
                null, 1, LocalTime.of(11, 50), b.get("학생회관"), "1층 편의점 앞 테이블",
                CustodyType.TEMPORARY, FoundItemStatus.REPORTED, null);
        saved.put("열쇠", item(reporter, key, "은색 열쇠 꾸러미", "은색 열쇠 3개와 동그란 고리",
                null, 5, LocalTime.of(16, 0), b.get("체육관"), "탈의실 입구 벤치",
                CustodyType.HANDED_OVER, FoundItemStatus.RETURN_PENDING, s.get("학생지원팀")));
        item(reporter, electronics, "흰색 보조배터리", "흰색 10000mAh 보조배터리, 케이블 없음",
                null, 0, LocalTime.of(8, 40), b.get("도서관"), "지하 1층 그룹스터디룸",
                CustodyType.PENDING_HANDOVER, FoundItemStatus.REPORTED, null);
        item(reporter, etc, "파란색 텀블러", "파란색 스테인리스 텀블러, 뚜껑 있음",
                null, 6, LocalTime.of(14, 15), b.get("인문관"), "3층 302호",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생회관"));
        item(reporter, clothing, "남색 접이식 우산", "남색 3단 접이식 우산",
                null, 2, LocalTime.of(19, 0), b.get("학생회관"), "정문 우산꽂이",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생회관"));
        item(reporter, wallet, "검은색 학생증 케이스", "검은색 실리콘 카드 케이스, 목걸이 줄 포함",
                null, 15, LocalTime.of(10, 0), b.get("행정관"), "2층 민원실",
                CustodyType.HANDED_OVER, FoundItemStatus.RETURNED, s.get("학생지원팀"));
        item(reporter, electronics, "스마트폰", "검은색 케이스를 씌운 스마트폰, 화면 잠김",
                "케이스 안쪽에 카드 한 장이 끼워져 있음", 0, LocalTime.of(7, 50), b.get("공학관"), "지하 1층 실습실",
                CustodyType.HANDED_OVER, FoundItemStatus.STORED, s.get("학생지원팀"));
        return saved;
    }

    // ------------------------------------------------------------------ 분실 신고 (9단계)

    /**
     * 시연용 분실 신고. 마이페이지(시연사용자2)와 지도의 주황색 마커 확인용.
     * - 시연사용자2: 찾는 중 2건(하나는 기간 + 추가 설명), 신고 종료 1건
     * - 시연사용자1: 찾는 중 1건 (본인 신고가 아닌 신고의 수정 차단 확인용)
     */
    private void seedLostReports(Map<String, User> users, Map<String, CampusBuilding> b) {
        User user1 = users.get(USER1_EMAIL);
        User user2 = users.get(USER2_EMAIL);
        lost(user2, category("전자기기"), "흰색 무선 이어폰 케이스", "[시연용] 흰색 무선 이어폰 충전 케이스, 스티커 없음",
                3, 2, b.get("학생회관"), "2층 식당이나 1층 편의점 중 한 곳으로 추정", LostReportStatus.SEARCHING);
        lost(user2, category("도서·문구"), "검은색 공학용 계산기", "[시연용] 뒷면에 이름 스티커를 뗀 자국",
                1, null, b.get("공학관"), "3층 강의실", LostReportStatus.SEARCHING);
        lost(user2, category("의류·잡화"), "회색 목도리", "[시연용] 회색 니트 목도리",
                12, null, b.get("인문관"), null, LostReportStatus.CLOSED);
        lost(user1, category("지갑·카드"), "남색 카드지갑", "[시연용] 남색 반지갑, 카드 칸 3개",
                2, null, b.get("도서관"), "1층 열람실", LostReportStatus.SEARCHING);
    }

    private void lost(User user, Category category, String title, String description,
                      int startDaysAgo, Integer endDaysAgo, CampusBuilding building, String detail,
                      LostReportStatus status) {
        LocalDate start = LocalDate.now().minusDays(startDaysAgo);
        LocalDate end = endDaysAgo == null ? null : LocalDate.now().minusDays(endDaysAgo);
        lostReportRepository.save(LostReport.builder()
                .user(user)
                .category(category)
                .title(title)
                .description(description)
                .lostDate(start)
                .lostEndDate(end)
                .lostBuilding(building)
                .lostLocation(building.getBuildingName())
                .lostLocationDetail(detail)
                // 지도에서 지점을 찍지 않은 신고: 지도에는 건물 위치로 표시된다
                .status(status)
                .build());
    }

    /** 반환 진행 중인 '은색 열쇠 꾸러미'에 대한 처리 중 신청 (마이페이지 반환 신청 탭, 수정 제한 확인용) */
    private void seedReturnRequests(Map<String, User> users, Map<String, FoundItem> items) {
        returnRequestRepository.save(ReturnRequest.builder()
                .item(items.get("열쇠"))
                .requester(users.get(USER2_EMAIL))
                .ownershipDescription("[시연용] 열쇠 고리에 작은 곰 모양 장식이 달려 있었어요.")
                .status(ReturnRequestStatus.APPROVED)
                .reviewComment("[시연용] 소유 확인 완료. 학생지원팀에서 신분 확인 후 수령해 주세요.")
                .processedAt(LocalDateTime.now().minusDays(1))
                .build());
    }

    private Category category(String name) {
        return categoryRepository.findByCategoryName(name)
                .orElseThrow(() -> new IllegalStateException(
                        "카테고리 '" + name + "'가 없습니다. Flyway 마이그레이션(V2)이 적용됐는지 확인하세요."));
    }

    private FoundItem item(User reporter, Category category, String title, String description, String privateFeatures,
                      int daysAgo, LocalTime time, CampusBuilding foundBuilding, String foundDetail,
                      CustodyType custodyType, FoundItemStatus status, StorageLocation storage) {
        LocalDate date = LocalDate.now().minusDays(daysAgo);
        // 오늘 날짜인데 시각이 아직 안 지났으면 미래 시각이 되지 않게 비운다.
        LocalTime foundTime = (daysAgo == 0 && time.isAfter(LocalTime.now())) ? null : time;

        FoundItem.FoundItemBuilder builder = FoundItem.builder()
                .reporter(reporter)
                .category(category)
                .foundBuilding(foundBuilding)
                .title(title)
                .description(description)
                .privateFeatures(privateFeatures)
                .foundDate(date)
                .foundTime(foundTime)
                .foundLocation(foundBuilding.getBuildingName())
                .foundLocationDetail(foundDetail)
                .foundLatitude(foundBuilding.getLatitude())
                .foundLongitude(foundBuilding.getLongitude())
                .custodyType(custodyType)
                .status(status);

        if (storage != null) {
            builder.storage(storage)
                    .storageLocation(storage.getStorageName())
                    .storageLocationDetail(storage.getDetailLocation())
                    .storageLatitude(storage.getLatitude())
                    .storageLongitude(storage.getLongitude());
        }
        return foundItemRepository.save(builder.build());
    }
}
