package com.thatsmine.service;

import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.me.MyReturnRequestDTO;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.FoundItemImage;
import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.repository.FoundItemImageRepository;
import com.thatsmine.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;

/**
 * 마이페이지의 반환 신청 내역 (조회만).
 * 반환 신청 작성·취소는 10단계에서 만든다.
 */
@Service
@RequiredArgsConstructor
public class MyPageService {

    private final ReturnRequestRepository returnRequestRepository;
    private final FoundItemImageRepository foundItemImageRepository;

    @Transactional(readOnly = true)
    public PageResponse<MyReturnRequestDTO> getMyReturnRequests(Long userId, int page, int size) {
        int pageSize = size <= 0 ? 20 : Math.min(size, 50);
        Page<ReturnRequest> result = returnRequestRepository.findByRequester_UserId(
                userId, PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(result.map(request -> {
            FoundItem item = request.getItem();
            boolean viewable = item.getDeletedAt() == null && item.getStatus() != FoundItemStatus.HIDDEN;
            return MyReturnRequestDTO.from(request, thumbnail(item.getItemId()), viewable);
        }));
    }

    private String thumbnail(Long itemId) {
        return foundItemImageRepository.findByItem_ItemIdOrderBySortOrderAsc(itemId).stream()
                .min(Comparator.comparing((FoundItemImage image) -> !Boolean.TRUE.equals(image.getIsThumbnail())))
                .map(FoundItemImage::getImageUrl)
                .orElse(null);
    }
}
