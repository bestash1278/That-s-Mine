package com.thatsmine.service;

import com.thatsmine.dto.PageResponse;
import com.thatsmine.dto.me.MyReturnRequestDTO;
import com.thatsmine.dto.returns.AdminReturnRequestDTO;
import com.thatsmine.dto.returns.CreateReturnRequestRequest;
import com.thatsmine.dto.returns.ReturnEligibilityDTO;
import com.thatsmine.dto.returns.ReviewReturnRequestRequest;
import com.thatsmine.entity.FoundItem;
import com.thatsmine.entity.FoundItemImage;
import com.thatsmine.entity.ReturnRequest;
import com.thatsmine.entity.User;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import com.thatsmine.exception.ConflictException;
import com.thatsmine.exception.FieldValidationException;
import com.thatsmine.exception.ForbiddenException;
import com.thatsmine.exception.NotFoundException;
import com.thatsmine.repository.FoundItemImageRepository;
import com.thatsmine.repository.FoundItemRepository;
import com.thatsmine.repository.ReturnRequestRepository;
import com.thatsmine.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 반환 신청(SPEC §15). 신청·취소는 신청자, 승인·반려·반환 완료는 관리자.
 *
 * <p>같은 물품이 두 사람에게 반환되지 않도록 물품 행에 비관적 잠금(SELECT ... FOR UPDATE)을 걸고 상태를 다시 읽은 뒤
 * 바꾼다. 물품의 {@code @Version}은 그 밖의 경로(신고자 수정 등)와의 충돌을 막는 두 번째 안전장치다.
 * 잠금 순서는 항상 '물품 → 신청'이다.
 */
@Service
@RequiredArgsConstructor
public class ReturnRequestService {

    private static final int MIN_DESCRIPTION = 5;
    private static final int MAX_DESCRIPTION = 500;
    private static final int MAX_NOTE = 300;
    private static final int MAX_COMMENT = 500;
    static final String AUTO_REJECT_COMMENT = "다른 신청자에게 반환이 완료되어 자동으로 반려되었습니다.";

    private final ReturnRequestRepository returnRequestRepository;
    private final FoundItemRepository foundItemRepository;
    private final FoundItemImageRepository foundItemImageRepository;
    private final UserRepository userRepository;

    // ------------------------------------------------------------------ 신청자

    /** 상세 화면에서 '반환 신청' 버튼을 보여줄지 정하는 정보 */
    @Transactional(readOnly = true)
    public ReturnEligibilityDTO getEligibility(Long itemId, Long userId) {
        FoundItem item = visibleItem(itemId);
        Optional<ReturnRequest> latest =
                returnRequestRepository.findFirstByItem_ItemIdAndRequester_UserIdOrderByCreatedAtDesc(itemId, userId);
        boolean active = latest.map(r -> ReturnRequestStatus.ACTIVE.contains(r.getStatus())).orElse(false);
        String reason = ReturnPolicy.requestBlockReason(item.getStatus(), item.getCustodyType(),
                item.getReporter().getUserId().equals(userId), active);
        return ReturnEligibilityDTO.builder()
                .canRequest(reason == null)
                .blockReason(reason)
                .myRequest(latest.map(r -> MyReturnRequestDTO.from(r, thumbnail(itemId), true)).orElse(null))
                .build();
    }

    @Transactional
    public MyReturnRequestDTO create(Long itemId, Long userId, CreateReturnRequestRequest request) {
        validateCreate(request);

        // 먼저 물품을 잠근다. 같은 사람의 이중 제출, 같은 물품에 대한 승인과 신청이 겹치는 경우를 직렬화한다.
        FoundItem item = foundItemRepository.findByIdForUpdate(itemId)
                .filter(found -> found.getStatus() != FoundItemStatus.HIDDEN)
                .orElseThrow(() -> new NotFoundException("습득물을 찾을 수 없습니다. 삭제되었거나 숨김 처리된 물품일 수 있습니다."));
        User requester = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        boolean active = returnRequestRepository.existsByItem_ItemIdAndRequester_UserIdAndStatusIn(
                itemId, userId, ReturnRequestStatus.ACTIVE);
        String reason = ReturnPolicy.requestBlockReason(item.getStatus(), item.getCustodyType(),
                item.getReporter().getUserId().equals(userId), active);
        if (reason != null) {
            throw new ConflictException(reason);
        }

        String description = request.getOwnershipDescription().trim();
        String note = trimToNull(request.getAdditionalNote());
        ReturnRequest saved = returnRequestRepository.save(ReturnRequest.builder()
                .item(item)
                .requester(requester)
                .ownershipDescription(note == null ? description : description + "\n[추가 설명] " + note)
                .status(ReturnRequestStatus.PENDING)
                .build());
        return MyReturnRequestDTO.from(saved, thumbnail(itemId), true);
    }

    /** 신청 취소: 신청자 본인만, 아직 처리 전(신청 대기)일 때만 */
    @Transactional
    public MyReturnRequestDTO cancel(Long requestId, Long userId) {
        ReturnRequest request = returnRequestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new NotFoundException("반환 신청을 찾을 수 없습니다."));
        if (!request.getRequester().getUserId().equals(userId)) {
            throw new ForbiddenException("본인이 한 반환 신청만 취소할 수 있습니다.");
        }
        if (request.getStatus() != ReturnRequestStatus.PENDING) {
            String guide = request.getStatus() == ReturnRequestStatus.APPROVED
                    ? " 이미 승인된 신청은 관리 부서에 문의해 주세요." : "";
            throw new ConflictException("'" + request.getStatus().getLabel() + "' 상태인 신청은 취소할 수 없습니다." + guide);
        }
        request.changeStatus(ReturnRequestStatus.CANCELLED, null);
        returnRequestRepository.flush();
        FoundItem item = request.getItem();
        boolean viewable = item.getDeletedAt() == null && item.getStatus() != FoundItemStatus.HIDDEN;
        return MyReturnRequestDTO.from(request, thumbnail(item.getItemId()), viewable);
    }

    // ------------------------------------------------------------------ 관리자

    @Transactional(readOnly = true)
    public PageResponse<AdminReturnRequestDTO> searchForAdmin(String status, int page, int size) {
        ReturnRequestStatus st = parseStatus(status);
        int pageSize = size <= 0 ? 20 : Math.min(size, 50);
        Page<ReturnRequest> result = returnRequestRepository.searchForAdmin(st,
                PageRequest.of(Math.max(page, 0), pageSize, Sort.by(Sort.Direction.DESC, "createdAt")));
        return PageResponse.from(result.map(r -> AdminReturnRequestDTO.from(r, thumbnail(r.getItem().getItemId()))));
    }

    /**
     * 승인·반려·반환 완료. 허용 전이: 대기→승인|반려, 승인→반환 완료|반려(승인 철회).
     * 승인하면 물품이 '반환 진행 중'이 되어 다른 신청은 승인할 수 없다.
     */
    @Transactional
    public AdminReturnRequestDTO review(Long requestId, ReviewReturnRequestRequest body) {
        ReturnRequestStatus next = parseReviewStatus(body == null ? null : body.getStatus());
        String comment = trimToNull(body.getComment());
        if (comment != null && comment.length() > MAX_COMMENT) {
            throw new FieldValidationException(Map.of("comment", "처리 메모는 " + MAX_COMMENT + "자 이하로 입력해 주세요."));
        }
        if (next == ReturnRequestStatus.REJECTED && comment == null) {
            throw new FieldValidationException(Map.of("comment", "반려 사유를 입력해 주세요. 신청자에게 그대로 보입니다."));
        }

        // 물품 → 신청 순으로 잠근다. 물품 ID는 값만 읽어 엔티티가 오래된 상태로 캐시되지 않게 한다.
        Long itemId = returnRequestRepository.findItemIdByRequestId(requestId)
                .orElseThrow(() -> new NotFoundException("반환 신청을 찾을 수 없습니다."));
        FoundItem item = foundItemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new NotFoundException("삭제된 물품의 신청입니다."));
        ReturnRequest request = returnRequestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new NotFoundException("반환 신청을 찾을 수 없습니다."));

        if (!ReturnPolicy.requestTransitionAllowed(request.getStatus(), next)) {
            throw new ConflictException("'" + request.getStatus().getLabel() + "' 상태인 신청은 '"
                    + next.getLabel() + "'(으)로 바꿀 수 없습니다.");
        }

        switch (next) {
            case APPROVED -> {
                if (!ReturnPolicy.isRequestable(item.getStatus(), item.getCustodyType())) {
                    throw new ConflictException(item.getStatus() == FoundItemStatus.RETURN_PENDING
                            ? "이미 다른 신청이 승인되어 반환이 진행 중입니다. 그 신청을 먼저 처리해 주세요."
                            : "'" + item.getStatus().getLabel() + "' 상태의 물품은 승인할 수 없습니다.");
                }
                item.changeStatus(FoundItemStatus.RETURN_PENDING);
            }
            case REJECTED -> {
                if (request.getStatus() == ReturnRequestStatus.APPROVED && item.getStatus() == FoundItemStatus.RETURN_PENDING) {
                    item.changeStatus(ReturnPolicy.statusAfterApprovalRevoked(item.getCustodyType()));
                }
            }
            case COMPLETED -> {
                item.changeStatus(FoundItemStatus.RETURNED);
                // 한 물품은 한 사람에게만 반환된다: 남은 대기 신청은 자동 반려
                for (ReturnRequest other : returnRequestRepository.findByItem_ItemIdAndStatus(itemId, ReturnRequestStatus.PENDING)) {
                    if (!other.getRequestId().equals(requestId)) {
                        other.changeStatus(ReturnRequestStatus.REJECTED, AUTO_REJECT_COMMENT);
                    }
                }
            }
            default -> throw new ConflictException("처리할 수 없는 상태입니다.");
        }
        request.changeStatus(next, comment);
        returnRequestRepository.flush();
        return AdminReturnRequestDTO.from(request, thumbnail(itemId));
    }

    // ------------------------------------------------------------------ 보조

    private FoundItem visibleItem(Long itemId) {
        return foundItemRepository.findByIdNotDeleted(itemId)
                .filter(found -> found.getStatus() != FoundItemStatus.HIDDEN)
                .orElseThrow(() -> new NotFoundException("습득물을 찾을 수 없습니다. 삭제되었거나 숨김 처리된 물품일 수 있습니다."));
    }

    private static void validateCreate(CreateReturnRequestRequest request) {
        Map<String, String> errors = new java.util.LinkedHashMap<>();
        String description = request == null ? null : trimToNull(request.getOwnershipDescription());
        if (description == null) {
            errors.put("ownershipDescription", "내 물건이라고 판단한 근거(물건의 특징)를 입력해 주세요.");
        } else if (description.length() < MIN_DESCRIPTION) {
            errors.put("ownershipDescription", "소유 확인에 쓸 특징을 " + MIN_DESCRIPTION + "자 이상 구체적으로 입력해 주세요.");
        } else if (description.length() > MAX_DESCRIPTION) {
            errors.put("ownershipDescription", "소유 확인 특징은 " + MAX_DESCRIPTION + "자 이하로 입력해 주세요.");
        }
        if (request != null && request.getAdditionalNote() != null && request.getAdditionalNote().trim().length() > MAX_NOTE) {
            errors.put("additionalNote", "추가 설명은 " + MAX_NOTE + "자 이하로 입력해 주세요.");
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
    }

    private static ReturnRequestStatus parseReviewStatus(String value) {
        if (value == null || value.isBlank()) {
            throw new FieldValidationException(Map.of("status", "처리할 상태를 선택해 주세요."));
        }
        ReturnRequestStatus status;
        try {
            status = ReturnRequestStatus.fromValue(value.trim());
        } catch (IllegalArgumentException e) {
            throw new FieldValidationException(Map.of("status", "올바르지 않은 상태입니다."));
        }
        if (status == ReturnRequestStatus.PENDING || status == ReturnRequestStatus.CANCELLED) {
            throw new FieldValidationException(Map.of("status", "관리자는 승인·반려·반환 완료로만 처리할 수 있습니다. 취소는 신청자만 할 수 있습니다."));
        }
        return status;
    }

    private static ReturnRequestStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return ReturnRequestStatus.fromValue(value.trim());
        } catch (IllegalArgumentException e) {
            throw new FieldValidationException(Map.of("status", "올바르지 않은 상태입니다."));
        }
    }

    private String thumbnail(Long itemId) {
        List<FoundItemImage> images = foundItemImageRepository.findByItem_ItemIdOrderBySortOrderAsc(itemId);
        return images.stream()
                .min(Comparator.comparing((FoundItemImage image) -> !Boolean.TRUE.equals(image.getIsThumbnail())))
                .map(FoundItemImage::getImageUrl)
                .orElse(null);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
