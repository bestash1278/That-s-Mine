package com.thatsmine.repository;

import com.thatsmine.entity.FoundItemImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoundItemImageRepository extends JpaRepository<FoundItemImage, Long> {
    // FoundItemImage는 item(연관관계)을 가지므로 item.itemId 경로를 밑줄로 명시한다.
    List<FoundItemImage> findByItem_ItemIdOrderBySortOrderAsc(Long itemId);
}
