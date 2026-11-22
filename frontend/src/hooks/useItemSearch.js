import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EMPTY_FILTERS, buildQueryString, parseSearchParams } from '../utils/queryParser.js';

/**
 * 조회 조건을 URL 쿼리에 둔다(상태 = URL).
 * 이전에는 window.history.replaceState로 주소만 바꿔서 React Router의 location이 갱신되지 않았고,
 * 상세 화면에서 "목록으로"를 누르면 처음 조건으로 돌아가는 문제가 있었다.
 *
 * @param basePath '/items' 또는 '/map'
 */
export function useItemSearch(basePath = '/items') {
  const location = useLocation();
  const navigate = useNavigate();

  const filters = useMemo(() => parseSearchParams(location.search), [location.search]);

  const setFilters = useCallback(
    (next) => {
      const qs = buildQueryString(next, { includeListOnly: basePath === '/items' });
      navigate(qs ? `${basePath}?${qs}` : basePath, { replace: true });
    },
    [navigate, basePath],
  );

  const updateFilter = useCallback(
    (key, value) => setFilters({ ...filters, [key]: value, page: 1 }),
    [filters, setFilters],
  );

  const removeFilter = useCallback(
    (key) => setFilters({ ...filters, [key]: EMPTY_FILTERS[key], page: 1 }),
    [filters, setFilters],
  );

  const clearAllFilters = useCallback(() => setFilters({ ...EMPTY_FILTERS }), [setFilters]);

  const setPage = useCallback((page) => setFilters({ ...filters, page }), [filters, setFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    setPage,
  };
}
