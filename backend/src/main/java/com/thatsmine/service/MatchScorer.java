package com.thatsmine.service;

import com.thatsmine.entity.CampusBuilding;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.LostReport;
import com.thatsmine.enums.FoundItemStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

/**
 * 분실 신고와 습득물의 유사도 점수 (SPEC §17). 외부 AI 없이 규칙으로만 계산한다.
 *
 * <ul>
 *   <li>카테고리 일치 30점</li>
 *   <li>물품명·특징 유사도 30점 (물품명 70% + 특징 30%, 동의어 사전으로 표현 차이를 흡수)</li>
 *   <li>위치 근접도 25점 (Haversine 거리: 100m 이내 만점, 1.5km 이상 0점)</li>
 *   <li>날짜 유사도 15점 (분실 기간 안에 발견되면 만점, 기간이 끝난 뒤 14일에 걸쳐 0점으로)</li>
 * </ul>
 * 발견 날짜가 분실 시작일보다 빠르거나(논리적으로 맞지 않음), 반환 완료·숨김 물품은 대상에서 제외한다.
 * 또한 이름·특징이 전혀 겹치지 않고 잃어버린 곳과도 멀면(종류와 날짜만 맞으면) 점수가 높아도 추천하지 않는다.
 * 습득자의 비공개 특징(private_features)은 점수에 쓰지 않는다. 순위나 점수로 비공개 특징이 추측되지 않게 하기 위해서다.
 * 점수는 "비슷한 정도"이지 소유 여부의 판정이 아니다.
 */
public final class MatchScorer {

    public static final int CATEGORY_POINTS = 30;
    public static final int TEXT_POINTS = 30;
    public static final int LOCATION_POINTS = 25;
    public static final int DATE_POINTS = 15;

    /** 이 점수 미만은 추천하지 않는다 */
    public static final int MIN_SCORE = 40;
    public static final int HIGH_SCORE = 70;
    public static final int MEDIUM_SCORE = 55;

    static final double NEAR_METERS = 100;
    static final double FAR_METERS = 1500;
    static final int DATE_DECAY_DAYS = 14;

    private MatchScorer() {
    }

    /** 점수 결과. 추천 대상이 아니면 {@link #score}가 null을 돌려준다. */
    public record Score(int total, int category, int text, int location, int date,
                        Double distanceMeters, List<String> reasons) {
        public String level() {
            return total >= HIGH_SCORE ? "HIGH" : total >= MEDIUM_SCORE ? "MEDIUM" : "LOW";
        }

        public String levelLabel() {
            return total >= HIGH_SCORE ? "가능성 높음" : total >= MEDIUM_SCORE ? "가능성 있음" : "참고";
        }
    }

    /**
     * @param expand 검색어 하나를 동의어까지 넓힌 집합(자기 자신 포함)을 돌려주는 함수
     * @return 점수. 대상이 아니거나 {@link #MIN_SCORE} 미만이면 null
     */
    public static Score score(LostReport lost, FoundItem found, Function<String, Set<String>> expand) {
        if (!isCandidate(lost, found)) {
            return null;
        }
        List<String> reasons = new ArrayList<>();

        int category = 0;
        if (lost.getCategory() != null && found.getCategory() != null
                && lost.getCategory().getCategoryId().equals(found.getCategory().getCategoryId())) {
            category = CATEGORY_POINTS;
            reasons.add("같은 종류예요 (" + found.getCategory().getCategoryName() + ")");
        }

        int text = textScore(lost, found, expand);
        if (text >= TEXT_POINTS / 2) {
            reasons.add("물품명·특징이 비슷해요");
        } else if (text > 0) {
            reasons.add("물품명·특징이 일부 겹쳐요");
        }

        Double distance = distanceMeters(lost, found);
        int location = locationScore(distance);
        if (distance != null && location >= LOCATION_POINTS / 2) {
            reasons.add("잃어버린 곳과 가까운 곳에서 발견됐어요 (약 " + roundDistance(distance) + "m)");
        } else if (location > 0) {
            reasons.add("잃어버린 곳에서 조금 떨어진 곳에서 발견됐어요 (약 " + roundDistance(distance) + "m)");
        }

        int date = dateScore(lost, found);
        if (date == DATE_POINTS) {
            reasons.add("분실 기간 안에 발견됐어요");
        } else if (date > 0) {
            reasons.add("분실 기간이 끝난 직후에 발견됐어요");
        }

        // 종류와 날짜만 맞는 물품(예: 파우치를 잃어버렸는데 같은 '의류·잡화'인 우산)은 추천하지 않는다.
        // 이름·특징이 조금이라도 겹치거나 잃어버린 곳과 가까워야 한다.
        if (text == 0 && location < LOCATION_POINTS / 2) {
            return null;
        }

        int total = category + text + location + date;
        if (total < MIN_SCORE) {
            return null;
        }
        return new Score(total, category, text, location, date, distance, List.copyOf(reasons));
    }

    /** 추천 대상인지: 반환 완료·숨김 제외, 분실 시작일보다 먼저 발견된 물품 제외 */
    public static boolean isCandidate(LostReport lost, FoundItem found) {
        if (found.getStatus() == FoundItemStatus.RETURNED || found.getStatus() == FoundItemStatus.HIDDEN) {
            return false;
        }
        return !found.getFoundDate().isBefore(lost.getLostDate());
    }

    // ------------------------------------------------------------------ 날짜

    static int dateScore(LostReport lost, FoundItem found) {
        LocalDate end = lost.getLostEndDate() != null ? lost.getLostEndDate() : lost.getLostDate();
        if (!found.getFoundDate().isAfter(end)) {
            return DATE_POINTS;
        }
        long days = ChronoUnit.DAYS.between(end, found.getFoundDate());
        return (int) Math.round(DATE_POINTS * Math.max(0, 1 - days / (double) DATE_DECAY_DAYS));
    }

    // ------------------------------------------------------------------ 위치

    static int locationScore(Double distanceMeters) {
        if (distanceMeters == null) {
            return 0;
        }
        if (distanceMeters <= NEAR_METERS) {
            return LOCATION_POINTS;
        }
        if (distanceMeters >= FAR_METERS) {
            return 0;
        }
        return (int) Math.round(LOCATION_POINTS * (FAR_METERS - distanceMeters) / (FAR_METERS - NEAR_METERS));
    }

    /** 분실 위치와 발견 위치 사이 거리(m). 지점 좌표가 없으면 건물 좌표를 쓰고, 둘 다 없으면 null */
    static Double distanceMeters(LostReport lost, FoundItem found) {
        BigDecimal[] a = point(lost.getLostLatitude(), lost.getLostLongitude(), lost.getLostBuilding());
        BigDecimal[] b = point(found.getFoundLatitude(), found.getFoundLongitude(), found.getFoundBuilding());
        if (a == null || b == null) {
            return null;
        }
        return haversineMeters(a[0].doubleValue(), a[1].doubleValue(), b[0].doubleValue(), b[1].doubleValue());
    }

    private static BigDecimal[] point(BigDecimal lat, BigDecimal lng, CampusBuilding building) {
        if (lat != null && lng != null) {
            return new BigDecimal[]{lat, lng};
        }
        if (building != null && building.getLatitude() != null && building.getLongitude() != null) {
            return new BigDecimal[]{building.getLatitude(), building.getLongitude()};
        }
        return null;
    }

    public static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double r = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    private static long roundDistance(Double meters) {
        return meters == null ? 0 : Math.round(meters / 10.0) * 10;
    }

    // ------------------------------------------------------------------ 물품명·특징

    private static int textScore(LostReport lost, FoundItem found, Function<String, Set<String>> expand) {
        List<String> titleTokens = tokens(lost.getTitle());
        if (titleTokens.isEmpty()) {
            return 0;
        }
        String foundText = normalize(found.getTitle() + " " + (found.getDescription() == null ? "" : found.getDescription()));
        double titleFraction = matchedFraction(titleTokens, foundText, expand);
        List<String> descTokens = tokens(lost.getDescription());
        double fraction = descTokens.isEmpty()
                ? titleFraction
                : 0.7 * titleFraction + 0.3 * matchedFraction(descTokens, foundText, expand);
        return (int) Math.round(TEXT_POINTS * fraction);
    }

    private static double matchedFraction(List<String> tokens, String foundText, Function<String, Set<String>> expand) {
        int matched = 0;
        String compact = foundText.replace(" ", "");
        for (String token : tokens) {
            Set<String> variants = new LinkedHashSet<>();
            variants.add(token);
            Set<String> expanded = expand == null ? null : expand.apply(token);
            if (expanded != null) {
                expanded.forEach(term -> variants.add(stem(normalize(term))));
            }
            boolean hit = variants.stream().anyMatch(v -> v.length() >= 2 && (foundText.contains(v) || compact.contains(v)));
            if (hit) {
                matched++;
            }
        }
        return matched / (double) tokens.size();
    }

    /** 공백·기호 기준으로 나눈 소문자 낱말. 한 글자는 버리고 끝의 '색'은 떼어 '파란색'과 '파란'이 같게 한다. */
    static List<String> tokens(String text) {
        List<String> result = new ArrayList<>();
        if (text == null) {
            return result;
        }
        for (String raw : normalize(text).split(" ")) {
            String token = stem(raw);
            if (token.length() >= 2 && !result.contains(token)) {
                result.add(token);
            }
        }
        return result;
    }

    private static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").trim();
    }

    private static String stem(String token) {
        return token.length() > 2 && token.endsWith("색") ? token.substring(0, token.length() - 1) : token;
    }
}
