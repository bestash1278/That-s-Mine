// 보관 유형 (SPEC §10, §19). 처리 상태와 독립적으로 관리한다.
export const CustodyType = {
  PENDING_HANDOVER: 'PENDING_HANDOVER',
  HANDED_OVER: 'HANDED_OVER',
  TEMPORARY: 'TEMPORARY',
};

export const CUSTODY_TYPE_OPTIONS = [
  {
    value: CustodyType.PENDING_HANDOVER,
    label: '관리 부서에 전달 예정',
    description: '아직 물건을 갖고 있고, 곧 관리 부서에 맡길 예정이에요.',
  },
  {
    value: CustodyType.HANDED_OVER,
    label: '관리 부서에 전달 완료',
    description: '이미 관리 부서나 보관 장소에 맡겼어요. 맡긴 곳을 선택해 주세요.',
  },
  {
    value: CustodyType.TEMPORARY,
    label: '습득자가 임시 보관 중',
    description: '당분간 제가 보관할게요. 연락처는 공개되지 않아요.',
  },
];

export const custodyTypeLabels = Object.fromEntries(
  CUSTODY_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export function getCustodyTypeLabel(custodyType) {
  return custodyTypeLabels[custodyType] || '선택 안 함';
}

export function isStorageRequiredForCustodyType(custodyType) {
  return custodyType === CustodyType.HANDED_OVER;
}
