package com.thatsmine.repository;

import com.thatsmine.entity.SearchSynonym;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchSynonymRepository extends JpaRepository<SearchSynonym, Long> {
    // term이 중복 등록돼도 오류가 나지 않게 List로 받는다.
    List<SearchSynonym> findAllByTerm(String term);

    List<SearchSynonym> findByTermContaining(String term);

    List<SearchSynonym> findByCanonical(String canonical);
}
