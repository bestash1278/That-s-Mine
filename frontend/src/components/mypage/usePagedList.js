import { useCallback, useEffect, useRef, useState } from 'react';
import { toUserError } from '../../api/client.js';

const PAGE_SIZE = 20;

/**
 * 마이페이지 목록 불러오기 + "더 보기"
 * @param fetchPage (page, size) => Promise<PageResponse>
 */
export function usePagedList(fetchPage) {
  const [state, setState] = useState({ loading: true, error: null, items: [], page: 0, totalElements: 0, totalPages: 0 });
  const seq = useRef(0);

  const load = useCallback(
    async (page = 0) => {
      const mySeq = (seq.current += 1);
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await fetchPage(page, PAGE_SIZE);
        if (mySeq !== seq.current) return;
        setState((prev) => ({
          loading: false,
          error: null,
          items: page === 0 ? data?.content || [] : [...prev.items, ...(data?.content || [])],
          page,
          totalElements: data?.totalElements || 0,
          totalPages: data?.totalPages || 0,
        }));
      } catch (err) {
        if (mySeq !== seq.current) return;
        setState((prev) => ({ ...prev, loading: false, error: toUserError(err, '목록을 불러오지 못했습니다.').message }));
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  return {
    ...state,
    hasMore: state.page + 1 < state.totalPages,
    reload: () => load(0),
    loadMore: () => load(state.page + 1),
  };
}
