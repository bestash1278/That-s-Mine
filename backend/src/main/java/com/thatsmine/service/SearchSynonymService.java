package com.thatsmine.service;

import java.util.ArrayList;
import java.util.List;
import com.thatsmine.entity.SearchSynonym;
import com.thatsmine.repository.SearchSynonymRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 검색어 동의어 확장. 예) "에어팟" → {에어팟, 이어폰, 버즈, 무선이어폰}
 * 검색어가 term과 정확히 같으면 그 canonical과, 같은 canonical을 가진 term들을 더한다.
 * 검색어 자체가 canonical이면 그 canonical을 가진 term들을 더한다.
 * 결과는 원래 검색어가 맨 앞에 오는 순서를 유지한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchSynonymService {
    private final SearchSynonymRepository searchSynonymRepository;

    public Set<String> expandKeywords(String keyword) {
        Set<String> expanded = new LinkedHashSet<>();
        expanded.add(keyword);

        Set<String> canonicals = new LinkedHashSet<>();
        for (SearchSynonym synonym : searchSynonymRepository.findAllByTerm(keyword)) {
            canonicals.add(synonym.getCanonical());
        }
        if (canonicals.isEmpty()) {
            canonicals.add(keyword);
        }
        for (String canonical : canonicals) {
            expanded.add(canonical);
            searchSynonymRepository.findByCanonical(canonical).forEach(s -> expanded.add(s.getTerm()));
        }
        return expanded;
    }

    /**
     * 검색 쿼리(kw1~kw3)용: 검색어를 동의어로 확장해 최대 3개를 돌려준다. 검색어가 없으면 모두 null.
     * 남는 자리는 첫 검색어로 채운다(LIKE에 null이 들어가지 않게).
     */
    public String[] expandToThree(String keyword) {
        String[] result = new String[3];
        String trimmed = keyword == null ? null : keyword.trim();
        if (trimmed == null || trimmed.isEmpty()) {
            return result;
        }
        List<String> terms = new ArrayList<>();
        terms.add(trimmed);
        for (String term : expandKeywords(trimmed)) {
            if (!terms.contains(term) && terms.size() < 3) {
                terms.add(term);
            }
        }
        for (int i = 0; i < 3; i++) {
            result[i] = i < terms.size() ? terms.get(i) : terms.get(0);
        }
        return result;
    }
}
