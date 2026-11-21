export function parseSearchParams(search) {
  const params = new URLSearchParams(search);
  return {
    keyword: params.get('keyword') || '',
    categoryId: params.get('categoryId') || '',
    startDate: params.get('startDate') || '',
    endDate: params.get('endDate') || '',
    sort: params.get('sort') || 'NEWEST',
    page: parseInt(params.get('page') || '1', 10),
  };
}

export function buildQueryString(filters) {
  const params = new URLSearchParams();
  if (filters.keyword) params.append('keyword', filters.keyword);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.sort && filters.sort !== 'NEWEST') params.append('sort', filters.sort);
  if (filters.page && filters.page > 1) params.append('page', filters.page);
  return params.toString();
}

export function hasActiveFilters(filters) {
  return !!(
    filters.keyword ||
    filters.categoryId ||
    filters.startDate ||
    filters.endDate ||
    filters.sort !== 'NEWEST'
  );
}

export function getActiveFilterCount(filters) {
  let count = 0;
  if (filters.keyword) count++;
  if (filters.categoryId) count++;
  if (filters.startDate) count++;
  if (filters.endDate) count++;
  if (filters.sort && filters.sort !== 'NEWEST') count++;
  return count;
}
