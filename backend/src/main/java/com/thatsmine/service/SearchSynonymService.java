package com.thatsmine.service;

import com.thatsmine.entity.SearchSynonym;
import com.thatsmine.repository.SearchSynonymRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class SearchSynonymService {
    private final SearchSynonymRepository searchSynonymRepository;

    public Set<String> expandKeywords(String keyword) {
        Set<String> expanded = new HashSet<>();
        expanded.add(keyword);

        Optional<SearchSynonym> synonym = searchSynonymRepository.findByTerm(keyword);
        if (synonym.isPresent()) {
            expanded.add(synonym.get().getCanonical());
            List<SearchSynonym> allSynonyms = searchSynonymRepository.findByCanonical(synonym.get().getCanonical());
            allSynonyms.forEach(s -> expanded.add(s.getTerm()));
        } else {
            List<SearchSynonym> synonymsByCanonical = searchSynonymRepository.findByCanonical(keyword);
            synonymsByCanonical.forEach(s -> expanded.add(s.getTerm()));
        }

        return expanded;
    }
}
