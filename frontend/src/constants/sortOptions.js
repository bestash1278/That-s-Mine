export const SORT_OPTIONS = [
  { value: 'NEWEST', label: '최신 등록순' },
  { value: 'OLDEST', label: '오래된 등록순' },
  { value: 'LATEST_FOUND', label: '최근 발견순' },
  { value: 'OLDEST_FOUND', label: '오래된 발견순' },
];

export const getSortLabel = (sortValue) => {
  const option = SORT_OPTIONS.find((opt) => opt.value === sortValue);
  return option?.label || '정렬';
};

// 프론트엔드에서 클라이언트 정렬 적용
export function sortItems(items, sortType, foundDateField = 'foundDate') {
  const sorted = [...items];

  switch (sortType) {
    case 'OLDEST':
      return sorted.reverse();
    case 'LATEST_FOUND':
      return sorted.sort((a, b) => new Date(b[foundDateField]) - new Date(a[foundDateField]));
    case 'OLDEST_FOUND':
      return sorted.sort((a, b) => new Date(a[foundDateField]) - new Date(b[foundDateField]));
    case 'NEWEST':
    default:
      return sorted; // API에서 createdAt DESC로 반환
  }
}
