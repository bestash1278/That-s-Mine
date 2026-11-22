package com.thatsmine.service;

import com.thatsmine.enums.CustodyType;
import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.ReturnRequestStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReturnPolicyTest {

    @Test
    void 보관_중이거나_임시_보관_접수건만_신청을_받는다() {
        assertThat(ReturnPolicy.isRequestable(FoundItemStatus.STORED, CustodyType.HANDED_OVER)).isTrue();
        assertThat(ReturnPolicy.isRequestable(FoundItemStatus.REPORTED, CustodyType.TEMPORARY)).isTrue();
        assertThat(ReturnPolicy.isRequestable(FoundItemStatus.REPORTED, CustodyType.PENDING_HANDOVER)).isFalse();
        assertThat(ReturnPolicy.isRequestable(FoundItemStatus.RETURN_PENDING, CustodyType.HANDED_OVER)).isFalse();
        assertThat(ReturnPolicy.isRequestable(FoundItemStatus.RETURNED, CustodyType.HANDED_OVER)).isFalse();
        assertThat(ReturnPolicy.isRequestable(FoundItemStatus.HIDDEN, CustodyType.HANDED_OVER)).isFalse();
    }

    @Test
    void 신청을_막는_이유는_사용자에게_보여줄_문장이다() {
        assertThat(ReturnPolicy.requestBlockReason(FoundItemStatus.STORED, CustodyType.HANDED_OVER, false, false)).isNull();
        assertThat(ReturnPolicy.requestBlockReason(FoundItemStatus.STORED, CustodyType.HANDED_OVER, true, false))
                .contains("본인이 신고한");
        assertThat(ReturnPolicy.requestBlockReason(FoundItemStatus.STORED, CustodyType.HANDED_OVER, false, true))
                .contains("이미 반환 신청");
        assertThat(ReturnPolicy.requestBlockReason(FoundItemStatus.RETURN_PENDING, CustodyType.HANDED_OVER, false, false))
                .contains("진행 중");
        assertThat(ReturnPolicy.requestBlockReason(FoundItemStatus.RETURNED, CustodyType.HANDED_OVER, false, false))
                .contains("반환이 완료");
        assertThat(ReturnPolicy.requestBlockReason(FoundItemStatus.REPORTED, CustodyType.PENDING_HANDOVER, false, false))
                .contains("보관 장소가 확정되지 않은");
    }

    @Test
    void 반환_신청_전이표() {
        assertThat(ReturnPolicy.nextStatuses(ReturnRequestStatus.PENDING))
                .containsExactly(ReturnRequestStatus.APPROVED, ReturnRequestStatus.REJECTED);
        assertThat(ReturnPolicy.nextStatuses(ReturnRequestStatus.APPROVED))
                .containsExactly(ReturnRequestStatus.COMPLETED, ReturnRequestStatus.REJECTED);
        for (ReturnRequestStatus end : List.of(ReturnRequestStatus.REJECTED, ReturnRequestStatus.COMPLETED, ReturnRequestStatus.CANCELLED)) {
            assertThat(ReturnPolicy.nextStatuses(end)).isEmpty();
        }
        assertThat(ReturnPolicy.requestTransitionAllowed(ReturnRequestStatus.PENDING, ReturnRequestStatus.COMPLETED)).isFalse();
        // 관리자는 취소로 바꿀 수 없다(신청자만)
        assertThat(ReturnPolicy.requestTransitionAllowed(ReturnRequestStatus.PENDING, ReturnRequestStatus.CANCELLED)).isFalse();
    }

    @Test
    void 승인을_철회하면_임시_보관은_접수로_나머지는_보관_중으로_돌아간다() {
        assertThat(ReturnPolicy.statusAfterApprovalRevoked(CustodyType.TEMPORARY)).isEqualTo(FoundItemStatus.REPORTED);
        assertThat(ReturnPolicy.statusAfterApprovalRevoked(CustodyType.HANDED_OVER)).isEqualTo(FoundItemStatus.STORED);
    }

    @Test
    void 관리자_처리_상태는_반환_진행과_완료로_직접_바꿀_수_없다() {
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.STORED, FoundItemStatus.RETURNED, CustodyType.HANDED_OVER, false))
                .contains("반환 신청");
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.RETURN_PENDING, FoundItemStatus.HIDDEN, CustodyType.HANDED_OVER, true))
                .contains("반환 신청");
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.RETURNED, FoundItemStatus.STORED, CustodyType.HANDED_OVER, false))
                .isNotNull();
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.STORED, FoundItemStatus.STORED, CustodyType.HANDED_OVER, false))
                .contains("이미");
    }

    @Test
    void 처리_중인_신청이_있으면_숨길_수_없다() {
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.STORED, FoundItemStatus.HIDDEN, CustodyType.HANDED_OVER, true))
                .contains("처리 중인 반환 신청");
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.STORED, FoundItemStatus.HIDDEN, CustodyType.HANDED_OVER, false))
                .isNull();
    }

    @Test
    void 보관_장소가_없으면_보관_중으로_바꿀_수_없다() {
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.REPORTED, FoundItemStatus.STORED, CustodyType.PENDING_HANDOVER, false))
                .contains("보관 장소");
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.REPORTED, FoundItemStatus.STORED, CustodyType.HANDED_OVER, false))
                .isNull();
        assertThat(ReturnPolicy.adminStatusBlockReason(FoundItemStatus.REPORTED, FoundItemStatus.STORED, CustodyType.TEMPORARY, false))
                .isNull();
    }

    @Test
    void 허용_목록은_차단_규칙과_일치한다() {
        assertThat(ReturnPolicy.adminSelectableStatuses(FoundItemStatus.STORED, CustodyType.HANDED_OVER, false))
                .containsExactlyInAnyOrder(FoundItemStatus.REPORTED, FoundItemStatus.HIDDEN);
        assertThat(ReturnPolicy.adminSelectableStatuses(FoundItemStatus.RETURN_PENDING, CustodyType.HANDED_OVER, true)).isEmpty();
        assertThat(ReturnPolicy.adminSelectableStatuses(FoundItemStatus.HIDDEN, CustodyType.PENDING_HANDOVER, false))
                .containsExactly(FoundItemStatus.REPORTED);
    }
}
