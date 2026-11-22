import { useCallback, useEffect, useState } from 'react';
import { getCampusBuildings, getCategories, getStorageLocations } from '../api/reference.js';
import { CATEGORIES } from '../constants/categories.js';

/**
 * 신고 폼에서 쓰는 기준 데이터(카테고리, 건물, 공식 보관 장소).
 * 카테고리는 서버 응답이 없으면 constants의 목록으로 대신한다.
 * 건물·보관 장소는 서버에만 있으므로 실패하면 빈 목록 + 오류 메시지를 돌려주고,
 * 화면은 직접 입력으로 대신할 수 있게 한다.
 */
export function useReferenceData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    categories: CATEGORIES.map((c) => ({ categoryId: c.id, categoryName: c.name })),
    buildings: [],
    storageLocations: [],
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const [categories, buildings, storageLocations] = await Promise.allSettled([
      getCategories(),
      getCampusBuildings(),
      getStorageLocations(),
    ]);
    setState((prev) => ({
      loading: false,
      error:
        buildings.status === 'rejected' || storageLocations.status === 'rejected'
          ? '교내 건물·보관 장소 목록을 불러오지 못했습니다. 장소를 직접 입력할 수 있어요.'
          : null,
      categories:
        categories.status === 'fulfilled' && categories.value.length > 0 ? categories.value : prev.categories,
      buildings: buildings.status === 'fulfilled' ? buildings.value : [],
      storageLocations: storageLocations.status === 'fulfilled' ? storageLocations.value : [],
    }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
