package com.thatsmine.service;

import com.thatsmine.dto.FoundItemListItemDTO;
import com.thatsmine.dto.lost.MatchedItemDTO;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.FoundItemImage;
import com.thatsmine.entity.LostReport;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.LostReportStatus;
import com.thatsmine.exception.ForbiddenException;
import com.thatsmine.exception.NotFoundException;
import com.thatsmine.repository.FoundItemImageRepository;
import com.thatsmine.repository.FoundItemRepository;
import com.thatsmine.repository.LostReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * 유사 물품 추천 (SPEC §17). 규칙 기반 점수({@link MatchScorer})로 분실 신고마다 비슷한 습득물을 고른다.
 * 추천은 로그인한 신고자 본인(또는 관리자)만 볼 수 있고, 찾는 중인 신고에만 제공한다.
 */
@Service
@RequiredArgsConstructor
public class MatchService {

    static final int MAX_RESULTS = 10;
    static final int MAX_CANDIDATES = 500;
    private static final List<FoundItemStatus> EXCLUDED = List.of(FoundItemStatus.RETURNED, FoundItemStatus.HIDDEN);

    private final LostReportRepository lostReportRepository;
    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final SearchSynonymService searchSynonymService;

    @Transactional(readOnly = true)
    public List<MatchedItemDTO> getMatches(Long reportId, Long viewerId, boolean admin) {
        LostReport report = lostReportRepository.findByIdNotDeleted(reportId)
                .orElseThrow(() -> new NotFoundException("분실 신고를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다."));
        if (!admin && !report.getUser().getUserId().equals(viewerId)) {
            throw new ForbiddenException("본인이 등록한 분실 신고의 유사 습득물만 볼 수 있습니다.");
        }
        if (report.getStatus() != LostReportStatus.SEARCHING) {
            return List.of();
        }
        List<Scored> ranked = rank(report, candidates(report.getLostDate()), memoizedExpansion());
        return ranked.stream().limit(MAX_RESULTS)
                .map(s -> MatchedItemDTO.builder()
                        .item(FoundItemListItemDTO.from(s.item(), thumbnail(s.item().getItemId())))
                        .score(s.score().total())
                        .level(s.score().level())
                        .levelLabel(s.score().levelLabel())
                        .reasons(s.score().reasons())
                        .build())
                .toList();
    }

    /**
     * 마이페이지 목록용: 찾는 중인 신고마다 유사 습득물 수. 후보는 한 번만 읽어 신고마다 따로 조회하지 않는다.
     * 찾는 중이 아닌 신고는 맵에 넣지 않는다(화면에 표시하지 않음).
     */
    @Transactional(readOnly = true)
    public Map<Long, Integer> countFor(Collection<LostReport> reports) {
        List<LostReport> searching = reports.stream().filter(r -> r.getStatus() == LostReportStatus.SEARCHING).toList();
        Map<Long, Integer> counts = new HashMap<>();
        if (searching.isEmpty()) {
            return counts;
        }
        LocalDate earliest = searching.stream().map(LostReport::getLostDate).min(Comparator.naturalOrder()).orElseThrow();
        List<FoundItem> pool = candidates(earliest);
        Function<String, Set<String>> expand = memoizedExpansion();
        for (LostReport report : searching) {
            counts.put(report.getReportId(), rank(report, pool, expand).size());
        }
        return counts;
    }

    record Scored(FoundItem item, MatchScorer.Score score) {
    }

    /** 점수 높은 순, 같으면 최근에 발견된 물품 먼저 */
    static List<Scored> rank(LostReport report, List<FoundItem> pool, Function<String, Set<String>> expand) {
        return pool.stream()
                .map(item -> {
                    MatchScorer.Score score = MatchScorer.score(report, item, expand);
                    return score == null ? null : new Scored(item, score);
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingInt((Scored s) -> s.score().total()).reversed()
                        .thenComparing((Scored s) -> s.item().getFoundDate(), Comparator.reverseOrder())
                        .thenComparing((Scored s) -> s.item().getItemId(), Comparator.reverseOrder()))
                .toList();
    }

    private List<FoundItem> candidates(LocalDate fromDate) {
        return foundItemRepository.findMatchCandidates(EXCLUDED, fromDate, PageRequest.of(0, MAX_CANDIDATES));
    }

    /** 같은 낱말을 후보마다 다시 확장하지 않게 한 번만 계산한다 */
    private Function<String, Set<String>> memoizedExpansion() {
        Map<String, Set<String>> cache = new HashMap<>();
        return token -> cache.computeIfAbsent(token, searchSynonymService::expandKeywords);
    }

    private String thumbnail(Long itemId) {
        return foundItemImageRepository.findByItem_ItemIdOrderBySortOrderAsc(itemId).stream()
                .min(Comparator.comparing((FoundItemImage image) -> !Boolean.TRUE.equals(image.getIsThumbnail())))
                .map(FoundItemImage::getImageUrl)
                .orElse(null);
    }
}
