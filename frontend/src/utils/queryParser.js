// 조회 조건 ↔ URL 쿼리. 목록(/items)과 지도(/map)가 같은 키를 써서 화면을 바꿔도 조건이 유지된다.

export const FILTER_KEYS = ['keyword', 'categoryId', 'status', 'startDate', 'endDate'];

export const EMPTY_FILTERS = {
  keyword: '',
  categoryId: '',
  status: '',
  startDate: '',
  endDate: '',
  sort: 'NEWEST',
  page: 1,
};

export function parseSearchParams(search) {
  const params = new URLSearchParams(search);
  const page = parseInt(params.get('page') || '1', 10);
  return {
    keyword: params.get('keyword') || '',
    categoryId: params.get('categoryId') || '',
    status: params.get('status') || '',
    startDate: params.get('startDate') || '',
    endDate: params.get('endDate') || '',
    sort: params.get('sort') || 'NEWEST',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * @param options.includeListOnly false면 목록 전용 값(sort, page)은 빼고 만든다(지도로 넘길 때)
 */
export function buildQueryString(filters, { includeListOnly = true } = {}) {
  const params = new URLSearchParams();
  FILTER_KEYS.forEach((key) => {
    if (filters[key]) params.append(key, filters[key]);
  });
  if (includeListOnly) {
    if (filters.sort && filters.sort !== 'NEWEST') params.append('sort', filters.sort);
    if (filters.page && filters.page > 1) params.append('page', filters.page);
  }
  return params.toString();
}

export function hasActiveFilters(filters) {
  return FILTER_KEYS.some((key) => filters[key]) || (filters.sort && filters.sort !== 'NEWEST');
}

export function getActiveFilterCount(filters) {
  let count = FILTER_KEYS.filter((key) => filters[key]).length;
  if (filters.sort && filters.sort !== 'NEWEST') count += 1;
  return count;
}
