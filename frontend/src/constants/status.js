// 습득물 처리 상태 (SPEC §19). 백엔드 FoundItemStatus와 문자열이 같아야 한다.
export const FoundItemStatus = {
  REPORTED: 'REPORTED',
  STORED: 'STORED',
  RETURN_PENDING: 'RETURN_PENDING',
  RETURNED: 'RETURNED',
  HIDDEN: 'HIDDEN',
};

export const statusLabels = {
  REPORTED: '신고 접수',
  STORED: '보관 중',
  RETURN_PENDING: '반환 진행 중',
  RETURNED: '반환 완료',
  HIDDEN: '숨김 처리',
};

// 색만으로 구분하지 않도록 StatusBadge는 항상 텍스트와 함께 쓴다.
export const statusColors = {
  REPORTED: 'bg-blue-100 text-blue-900',
  STORED: 'bg-green-100 text-green-900',
  RETURN_PENDING: 'bg-amber-100 text-amber-900',
  RETURNED: 'bg-gray-200 text-gray-800',
  HIDDEN: 'bg-gray-200 text-gray-800',
};

// 분실 신고 상태 (SPEC §19). 백엔드 LostReportStatus와 같아야 한다.
export const LostReportStatus = {
  SEARCHING: 'SEARCHING',
  FOUND: 'FOUND',
  CLOSED: 'CLOSED',
};

export const lostReportStatusLabels = {
  SEARCHING: '찾는 중',
  FOUND: '찾기 완료',
  CLOSED: '신고 종료',
};

// 반환 신청 상태 (SPEC §15, §19)
export const ReturnRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const returnRequestStatusLabels = {
  PENDING: '신청 대기',
  APPROVED: '승인',
  REJECTED: '반려',
  COMPLETED: '반환 완료',
  CANCELLED: '신청 취소',
};

// 세 종류의 상태 값은 문자열이 겹치지 않으므로 StatusBadge 하나로 함께 표시한다.
Object.assign(statusLabels, lostReportStatusLabels, returnRequestStatusLabels);
Object.assign(statusColors, {
  SEARCHING: 'bg-orange-100 text-orange-900',
  FOUND: 'bg-green-100 text-green-900',
  CLOSED: 'bg-gray-200 text-gray-800',
  PENDING: 'bg-blue-100 text-blue-900',
  APPROVED: 'bg-green-100 text-green-900',
  REJECTED: 'bg-red-100 text-red-900',
  COMPLETED: 'bg-gray-200 text-gray-800',
  CANCELLED: 'bg-gray-200 text-gray-800',
});

// 보관 유형은 constants/custodyTypes.js에서 관리한다(여기 있던 중복 정의는 그쪽을 다시 내보냄).
export { CustodyType, custodyTypeLabels } from './custodyTypes.js';

// 관리자 화면: 습득물 처리 상태를 바꾸는 버튼 이름과 확인 문구 (서버가 허용한 상태만 버튼으로 보인다)
export const itemStatusActionLabels = {
  REPORTED: '신고 접수로 되돌리기',
  STORED: '보관 중으로 변경',
  HIDDEN: '숨김 처리',
};

// 관리자 화면: 반환 신청 처리 버튼
export const returnReviewActionLabels = {
  APPROVED: '승인',
  REJECTED: '반려',
  COMPLETED: '반환 완료 처리',
};
