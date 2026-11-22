package com.thatsmine.service;

import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;

import java.util.List;

/**
 * 반환 신청과 습득물 처리 상태의 허용 규칙(SPEC §14, §15, §19). 서비스가 항상 이 규칙으로 검증하고,
 * 프론트는 서버가 알려 준 허용 목록만 보여준다(프론트 검증만 믿지 않는다).
 * 막을 때는 사용자에게 그대로 보여줄 수 있는 문장을 돌려준다(가능하면 null).
 */
public final class ReturnPolicy {

    private ReturnPolicy() {
    }

    /** 반환 신청을 받을 수 있는 물품인지: 보관 중이거나, 습득자가 임시 보관 중인 접수 건 */
    public static boolean isRequestable(FoundItemStatus status, CustodyType custodyType) {
        return status == FoundItemStatus.STORED
                || (status == FoundItemStatus.REPORTED && custodyType == CustodyType.TEMPORARY);
    }

    /** 반환 신청을 막는 이유. 가능하면 null */
    public static String requestBlockReason(FoundItemStatus status, CustodyType custodyType,
                                            boolean isReporter, boolean hasActiveOwnRequest) {
        if (isReporter) {
            return "본인이 신고한 습득물에는 반환 신청을 할 수 없습니다.";
        }
        if (hasActiveOwnRequest) {
            return "이미 반환 신청을 했습니다. 마이페이지의 '반환 신청' 탭에서 진행 상황을 확인해 주세요.";
        }
        if (status == FoundItemStatus.RETURN_PENDING) {
            return "다른 신청자에게 반환 절차가 진행 중인 물품입니다. 반환이 취소되면 다시 신청할 수 있습니다.";
        }
        if (status == FoundItemStatus.RETURNED) {
            return "이미 반환이 완료된 물품입니다.";
        }
        if (status == FoundItemStatus.HIDDEN) {
            return "신청할 수 없는 물품입니다.";
        }
        if (!isRequestable(status, custodyType)) {
            return "아직 보관 장소가 확정되지 않은 물품입니다. 보관 장소가 정해진 뒤에 신청할 수 있습니다.";
        }
        return null;
    }

    /** 관리자가 반환 신청을 바꿀 수 있는 다음 상태 (취소는 신청자만 할 수 있다) */
    public static List<ReturnRequestStatus> nextStatuses(ReturnRequestStatus from) {
        return switch (from) {
            case PENDING -> List.of(ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED);
            case APPROVED -> List.of(ReturnRequestStatus.COMPLETED, ReturnRequestStatus.REJECTED);
            default -> List.of();
        };
    }

    public static boolean requestTransitionAllowed(ReturnRequestStatus from, ReturnRequestStatus to) {
        return nextStatuses(from).contains(to);
    }

    /** 승인을 철회(반려)했을 때 물품을 되돌릴 상태 */
    public static FoundItemStatus statusAfterApprovalRevoked(CustodyType custodyType) {
        return custodyType == CustodyType.TEMPORARY ? FoundItemStatus.REPORTED : FoundItemStatus.STORED;
    }

    /** 관리자가 직접 바꿀 수 있는 처리 상태 (반환 진행 중·완료는 반환 신청 처리로만 바뀐다) */
    public static List<FoundItemStatus> adminSelectableStatuses(FoundItemStatus from, CustodyType custodyType,
                                                                boolean hasActiveRequests) {
        return List.of(FoundItemStatus.REPORTED, FoundItemStatus.STORED, FoundItemStatus.HIDDEN).stream()
                .filter(to -> adminStatusBlockReason(from, to, custodyType, hasActiveRequests) == null)
                .toList();
    }

    /** 관리자가 처리 상태를 바꾸지 못하는 이유. 가능하면 null */
    public static String adminStatusBlockReason(FoundItemStatus from, FoundItemStatus to,
                                                CustodyType custodyType, boolean hasActiveRequests) {
        if (from == to) {
            return "이미 '" + to.getLabel() + "' 상태입니다.";
        }
        if (from == FoundItemStatus.RETURN_PENDING || from == FoundItemStatus.RETURNED
                || to == FoundItemStatus.RETURN_PENDING || to == FoundItemStatus.RETURNED) {
            return "반환 진행·완료 상태는 '반환 신청' 화면에서 신청을 처리해야 바뀝니다.";
        }
        if (to == FoundItemStatus.HIDDEN && hasActiveRequests) {
            return "처리 중인 반환 신청이 있어 숨길 수 없습니다. 먼저 반환 신청을 처리해 주세요.";
        }
        if (to == FoundItemStatus.STORED
                && custodyType != CustodyType.HANDED_OVER && custodyType != CustodyType.TEMPORARY) {
            return "보관 장소가 정해지지 않아 '보관 중'으로 바꿀 수 없습니다. 먼저 보관 장소를 지정해 주세요.";
        }
        return null;
    }
}
