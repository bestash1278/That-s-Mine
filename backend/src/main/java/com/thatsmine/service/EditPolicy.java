package com.thatsmine.service;

import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.LostReportStatus;

/**
 * 신고자가 자기 신고를 수정·삭제할 수 있는지 정하는 규칙 (SPEC §14).
 * 반환이 진행 중이거나 끝난 신고는 반환 이력이 손상되지 않도록 막는다.
 * 화면에 이유를 보여줄 수 있게, 막을 때는 사용자가 읽을 문장을 돌려준다(가능하면 null).
 */
public final class EditPolicy {

    private EditPolicy() {
    }

    /** 습득물 수정·삭제를 막는 이유. 가능하면 null */
    public static String foundItemLockReason(FoundItemStatus status, boolean hasActiveReturnRequest) {
        if (status == FoundItemStatus.HIDDEN) {
            return "관리자가 숨김 처리한 신고는 수정·삭제할 수 없습니다. 관리 부서에 문의해 주세요.";
        }
        if (status == FoundItemStatus.RETURN_PENDING) {
            return "반환이 진행 중인 물품은 수정·삭제할 수 없습니다.";
        }
        if (status == FoundItemStatus.RETURNED) {
            return "반환이 완료된 물품은 기록 보존을 위해 수정·삭제할 수 없습니다.";
        }
        if (hasActiveReturnRequest) {
            return "반환 신청이 접수된 물품이라 수정·삭제할 수 없습니다. 신청이 처리된 뒤 다시 시도해 주세요.";
        }
        return null;
    }

    /** 분실 신고 내용 수정을 막는 이유. 가능하면 null. (삭제와 상태 변경은 언제나 본인이 할 수 있다) */
    public static String lostReportContentLockReason(LostReportStatus status) {
        if (status == LostReportStatus.FOUND || status == LostReportStatus.CLOSED) {
            return "'" + status.getLabel() + "' 상태인 신고는 내용을 수정할 수 없습니다. '찾는 중'으로 되돌리면 수정할 수 있어요.";
        }
        return null;
    }

    /** 분실 신고 상태 변경(찾는 중 ↔ 찾기 완료 ↔ 신고 종료). 같은 상태로 바꾸는 요청만 거절한다. */
    public static boolean lostReportStatusChangeAllowed(LostReportStatus from, LostReportStatus to) {
        return to != null && from != to;
    }
}
