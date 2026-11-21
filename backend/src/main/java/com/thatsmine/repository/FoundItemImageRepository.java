package com.thatsmine.repository;

import com.thatsmine.entity.FoundItemImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoundItemImageRepository extends JpaRepository<FoundItemImage, Long> {
    List<FoundItemImage> findByItemIdOrderBySortOrder(Long itemId);
}
