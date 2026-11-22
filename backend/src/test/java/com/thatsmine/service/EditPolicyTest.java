package com.thatsmine.service;

import com.thatsmine.enums.FoundItemStatus;
import com.thatsmine.enums.LostReportStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("신고 수정·삭제 제한 규칙")
class EditPolicyTest {

    @Test
    @DisplayName("신고 접수·보관 중이고 처리 중인 반환 신청이 없으면 습득물 수정 가능")
    void foundItemEditable() {
        assertThat(EditPolicy.foundItemLockReason(FoundItemStatus.REPORTED, false)).isNull();
        assertThat(EditPolicy.foundItemLockReason(FoundItemStatus.STORED, false)).isNull();
    }

    @Test
    @DisplayName("반환 진행 중·반환 완료·숨김 물품은 이유와 함께 막음")
    void foundItemLockedByStatus() {
        assertThat(EditPolicy.foundItemLockReason(FoundItemStatus.RETURN_PENDING, false)).contains("반환이 진행 중");
        assertThat(EditPolicy.foundItemLockReason(FoundItemStatus.RETURNED, false)).contains("반환이 완료");
        assertThat(EditPolicy.foundItemLockReason(FoundItemStatus.HIDDEN, false)).contains("숨김");
    }

    @Test
    @DisplayName("처리 중인 반환 신청이 있으면 보관 중이어도 막음")
    void foundItemLockedByActiveRequest() {
        assertThat(EditPolicy.foundItemLockReason(FoundItemStatus.STORED, true)).contains("반환 신청이 접수");
    }

    @Test
    @DisplayName("분실 신고는 '찾는 중'일 때만 내용 수정 가능")
    void lostReportContent() {
        assertThat(EditPolicy.lostReportContentLockReason(LostReportStatus.SEARCHING)).isNull();
        assertThat(EditPolicy.lostReportContentLockReason(LostReportStatus.FOUND)).contains("찾기 완료");
        assertThat(EditPolicy.lostReportContentLockReason(LostReportStatus.CLOSED)).contains("신고 종료");
    }

    @Test
    @DisplayName("분실 신고 상태는 다른 상태로만 바꿀 수 있음")
    void lostReportStatusChange() {
        assertThat(EditPolicy.lostReportStatusChangeAllowed(LostReportStatus.SEARCHING, LostReportStatus.FOUND)).isTrue();
        assertThat(EditPolicy.lostReportStatusChangeAllowed(LostReportStatus.CLOSED, LostReportStatus.SEARCHING)).isTrue();
        assertThat(EditPolicy.lostReportStatusChangeAllowed(LostReportStatus.FOUND, LostReportStatus.FOUND)).isFalse();
        assertThat(EditPolicy.lostReportStatusChangeAllowed(LostReportStatus.FOUND, null)).isFalse();
    }
}
