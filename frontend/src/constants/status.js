export const FoundItemStatus = {
  REPORTED: 'REPORTED',
  STORED: 'STORED',
  RETURN_PENDING: 'RETURN_PENDING',
  RETURNED: 'RETURNED',
  HIDDEN: 'HIDDEN',
};

export const statusLabels = {
  REPORTED: '신고됨',
  STORED: '보관 중',
  RETURN_PENDING: '반환 대기',
  RETURNED: '반환됨',
  HIDDEN: '숨김',
};

export const statusColors = {
  REPORTED: 'bg-blue-100 text-blue-800',
  STORED: 'bg-green-100 text-green-800',
  RETURN_PENDING: 'bg-yellow-100 text-yellow-800',
  RETURNED: 'bg-gray-100 text-gray-800',
  HIDDEN: 'bg-gray-100 text-gray-800',
};

export const CustodyType = {
  PENDING_HANDOVER: 'PENDING_HANDOVER',
  HANDED_OVER: 'HANDED_OVER',
  TEMPORARY: 'TEMPORARY',
};

export const custodyTypeLabels = {
  PENDING_HANDOVER: '인수 대기 중',
  HANDED_OVER: '인수 완료',
  TEMPORARY: '임시 보관 중',
};
