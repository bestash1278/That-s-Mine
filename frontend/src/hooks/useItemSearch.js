import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { parseSearchParams, buildQueryString } from '../utils/queryParser.js';

export function useItemSearch() {
  const location = useLocation();

  const initialFilters = {
    keyword: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    sort: 'NEWEST',
    page: 1,
  };

  const [filters, setFiltersState] = useState(() => {
    // 초기 로드 시 URL에서 파싱
    const parsed = parseSearchParams(location.search);
    return { ...initialFilters, ...parsed };
  });

  // 필터 변경 시 URL 업데이트
  useEffect(() => {
    const queryString = buildQueryString(filters);
    const newUrl = queryString ? `/items?${queryString}` : '/items';
    window.history.replaceState({}, '', newUrl);
  }, [filters]);

  const setFilters = (newFilters) => {
    setFiltersState(newFilters);
  };

  const updateFilter = (key, value) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // 필터 변경 시 첫 페이지로 리셋
    }));
  };

  const removeFilter = (key) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: initialFilters[key],
      page: 1,
    }));
  };

  const clearAllFilters = () => {
    setFiltersState({ ...initialFilters });
  };

  const setPage = (page) => {
    setFiltersState((prev) => ({
      ...prev,
      page,
    }));
  };

  return {
    filters,
    setFilters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    setPage,
  };
}
