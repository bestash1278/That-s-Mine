package com.thatsmine.service;

import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.Category;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.LostReport;
import com.thatsmine.enums.FoundItemStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

class MatchScorerTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 22);

    private final Category clothing = Category.builder().categoryId(4L).categoryName("의류·잡화").sortOrder(4).build();
    private final Category electronics = Category.builder().categoryId(1L).categoryName("전자기기").sortOrder(1).build();
    private final CampusBuilding library = building(1L, "도서관", "37.4979", "126.9566");
    // 도서관에서 북쪽으로 약 111m × 10 = 1.1km
    private final CampusBuilding far = building(2L, "체육관", "37.5079", "126.9566");
    private final CampusBuilding veryFar = building(3L, "후문", "37.5279", "126.9566");

    private static CampusBuilding building(Long id, String name, String lat, String lng) {
        return CampusBuilding.builder().buildingId(id).buildingName(name)
                .latitude(new BigDecimal(lat)).longitude(new BigDecimal(lng)).build();
    }

    private LostReport.LostReportBuilder lost() {
        return LostReport.builder().reportId(1L).category(clothing).title("파란색 파우치")
                .description("지퍼가 달린 작은 파우치").lostDate(TODAY.minusDays(3)).lostEndDate(TODAY.minusDays(1))
                .lostBuilding(library);
    }

    private FoundItem.FoundItemBuilder found() {
        return FoundItem.builder().itemId(10L).category(clothing).title("파란색 파우치")
                .description("지퍼가 달린 손바닥 크기의 파란색 천 파우치").foundDate(TODAY.minusDays(2))
                .foundBuilding(library).status(FoundItemStatus.STORED);
    }

    private static final Function<String, Set<String>> NO_SYNONYMS = token -> Set.of(token);

    @Test
    void 종류_이름_위치_날짜가_모두_맞으면_만점에_가깝고_가능성_높음() {
        MatchScorer.Score score = MatchScorer.score(lost().build(), found().build(), NO_SYNONYMS);
        assertThat(score).isNotNull();
        assertThat(score.category()).isEqualTo(30);
        assertThat(score.location()).isEqualTo(25);
        assertThat(score.date()).isEqualTo(15);
        assertThat(score.text()).isGreaterThanOrEqualTo(25);
        assertThat(score.total()).isGreaterThanOrEqualTo(MatchScorer.HIGH_SCORE).isLessThanOrEqualTo(100);
        assertThat(score.levelLabel()).isEqualTo("가능성 높음");
        assertThat(score.reasons()).anyMatch(r -> r.contains("같은 종류")).anyMatch(r -> r.contains("분실 기간 안에"));
    }

    @Test
    void 비슷한_오답은_정답보다_낮은_점수() {
        MatchScorer.Score answer = MatchScorer.score(lost().build(), found().build(), NO_SYNONYMS);
        MatchScorer.Score navy = MatchScorer.score(lost().build(),
                found().itemId(11L).title("남색 파우치").description("검은색 지퍼가 달린 남색 파우치").build(), NO_SYNONYMS);
        MatchScorer.Score pencilCase = MatchScorer.score(lost().build(),
                found().itemId(12L).category(Category.builder().categoryId(5L).categoryName("도서·문구").sortOrder(5).build())
                        .title("파란색 필통").description("반투명 파란색 플라스틱 필통").build(), NO_SYNONYMS);
        assertThat(navy).isNotNull();
        assertThat(navy.total()).isLessThan(answer.total());
        assertThat(pencilCase == null || pencilCase.total() < answer.total()).isTrue();
    }

    @Test
    void 분실_시작일보다_먼저_발견된_물품은_제외() {
        FoundItem earlier = found().foundDate(TODAY.minusDays(4)).build();
        assertThat(MatchScorer.isCandidate(lost().build(), earlier)).isFalse();
        assertThat(MatchScorer.score(lost().build(), earlier, NO_SYNONYMS)).isNull();
    }

    @Test
    void 반환_완료와_숨김_물품은_제외() {
        assertThat(MatchScorer.score(lost().build(), found().status(FoundItemStatus.RETURNED).build(), NO_SYNONYMS)).isNull();
        assertThat(MatchScorer.score(lost().build(), found().status(FoundItemStatus.HIDDEN).build(), NO_SYNONYMS)).isNull();
        assertThat(MatchScorer.score(lost().build(), found().status(FoundItemStatus.REPORTED).build(), NO_SYNONYMS)).isNotNull();
    }

    @Test
    void 날짜_점수는_분실_기간_안에서_만점이고_끝난_뒤_14일에_걸쳐_줄어든다() {
        LostReport report = lost().build(); // 기간 끝 = TODAY-1
        assertThat(MatchScorer.dateScore(report, found().foundDate(TODAY.minusDays(3)).build())).isEqualTo(15);
        assertThat(MatchScorer.dateScore(report, found().foundDate(TODAY.minusDays(1)).build())).isEqualTo(15);
        assertThat(MatchScorer.dateScore(report, found().foundDate(TODAY.plusDays(6)).build())).isEqualTo(8); // 7일 뒤 = 절반
        assertThat(MatchScorer.dateScore(report, found().foundDate(TODAY.plusDays(20)).build())).isZero();
    }

    @Test
    void 기간이_하루면_그날만_만점() {
        LostReport oneDay = lost().lostEndDate(null).lostDate(TODAY.minusDays(2)).build();
        assertThat(MatchScorer.dateScore(oneDay, found().foundDate(TODAY.minusDays(2)).build())).isEqualTo(15);
        assertThat(MatchScorer.dateScore(oneDay, found().foundDate(TODAY.minusDays(1)).build())).isEqualTo(14);
    }

    @Test
    void 위치_점수는_100m_이내_만점_1500m_이상_0점() {
        assertThat(MatchScorer.locationScore(0.0)).isEqualTo(25);
        assertThat(MatchScorer.locationScore(100.0)).isEqualTo(25);
        assertThat(MatchScorer.locationScore(800.0)).isBetween(10, 15);
        assertThat(MatchScorer.locationScore(1500.0)).isZero();
        assertThat(MatchScorer.locationScore(5000.0)).isZero();
        assertThat(MatchScorer.locationScore(null)).isZero();
    }

    @Test
    void 지점_좌표가_없으면_건물_좌표로_거리를_계산한다() {
        Double near = MatchScorer.distanceMeters(lost().build(), found().build());
        assertThat(near).isZero();
        Double km = MatchScorer.distanceMeters(lost().build(), found().foundBuilding(far).build());
        assertThat(km).isBetween(1000.0, 1200.0);
        // 지점 좌표가 있으면 건물보다 우선
        LostReport pinned = lost().lostLatitude(new BigDecimal("37.5079")).lostLongitude(new BigDecimal("126.9566")).build();
        assertThat(MatchScorer.distanceMeters(pinned, found().foundBuilding(far).build())).isZero();
    }

    @Test
    void 위치_정보가_없으면_위치_점수만_0이고_추천은_계속된다() {
        LostReport noPlace = lost().lostBuilding(null).build();
        MatchScorer.Score score = MatchScorer.score(noPlace, found().build(), NO_SYNONYMS);
        assertThat(score).isNotNull();
        assertThat(score.location()).isZero();
        assertThat(score.distanceMeters()).isNull();
    }

    @Test
    void 멀리_떨어진_곳은_위치_점수를_받지_못한다() {
        MatchScorer.Score score = MatchScorer.score(lost().build(), found().foundBuilding(veryFar).build(), NO_SYNONYMS);
        assertThat(score.location()).isZero();
    }

    @Test
    void 동의어_사전으로_표현_차이를_흡수한다() {
        LostReport earphone = lost().category(electronics).title("에어팟").description(null).build();
        FoundItem found = found().category(electronics).title("흰색 무선 이어폰").description("충전 케이스 포함").build();
        MatchScorer.Score without = MatchScorer.score(earphone, found, NO_SYNONYMS);
        Map<String, Set<String>> dictionary = Map.of("에어팟", new LinkedHashSet<>(List.of("에어팟", "이어폰", "버즈")));
        Function<String, Set<String>> synonyms = token -> dictionary.getOrDefault(token, Set.of(token));
        MatchScorer.Score with = MatchScorer.score(earphone, found, synonyms);
        assertThat(with).isNotNull();
        assertThat(with.text()).isEqualTo(30);
        assertThat(without == null || without.text() == 0).isTrue();
    }

    @Test
    void 끝의_색을_떼어_파란색과_파란을_같게_본다() {
        assertThat(MatchScorer.tokens("파란색 파우치!")).containsExactly("파란", "파우치");
        assertThat(MatchScorer.tokens("남색")).containsExactly("남색");
        assertThat(MatchScorer.tokens("a 가")).isEmpty();
    }

    @Test
    void 비공개_특징은_점수에_쓰지_않는다() {
        LostReport report = lost().title("노란 스티커").description(null).build();
        FoundItem secretOnly = found().title("회색 가방").description("회색 백팩")
                .privateFeatures("안쪽 주머니에 노란 스티커").build();
        MatchScorer.Score score = MatchScorer.score(report, secretOnly, NO_SYNONYMS);
        assertThat(score == null || score.text() == 0).isTrue();
    }

    @Test
    void 기준_점수_미만은_추천하지_않는다() {
        LostReport report = lost().category(electronics).title("노트북").description(null).build();
        FoundItem unrelated = found().title("우산").description("검은 우산").foundBuilding(veryFar)
                .foundDate(TODAY.plusDays(30)).build();
        assertThat(MatchScorer.score(report, unrelated, NO_SYNONYMS)).isNull();
    }

    @Test
    void 정렬_순서는_점수_높은_순이고_같으면_최근_발견_먼저() {
        LostReport report = lost().build();
        FoundItem best = found().itemId(1L).build();
        FoundItem same = found().itemId(2L).foundDate(TODAY.minusDays(1)).build();
        FoundItem weaker = found().itemId(3L).title("남색 파우치").description("남색").build();
        List<MatchService.Scored> ranked = MatchService.rank(report, List.of(weaker, best, same), NO_SYNONYMS);
        assertThat(ranked).extracting(s -> s.item().getItemId()).containsExactly(2L, 1L, 3L);
    }
}
