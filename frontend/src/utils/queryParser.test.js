import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, buildQueryString, getActiveFilterCount, hasActiveFilters, parseSearchParams } from './queryParser.js';

describe('queryParser', () => {
  it('목록 → 지도로 넘길 때 검색 조건은 유지하고 정렬·페이지는 뺀다', () => {
    const filters = parseSearchParams('?keyword=파우치&categoryId=4&status=STORED&sort=OLDEST&page=3');
    expect(filters).toMatchObject({ keyword: '파우치', categoryId: '4', status: 'STORED', sort: 'OLDEST', page: 3 });
    expect(buildQueryString(filters, { includeListOnly: false })).toBe(
      'keyword=%ED%8C%8C%EC%9A%B0%EC%B9%98&categoryId=4&status=STORED',
    );
    expect(buildQueryString(filters)).toContain('sort=OLDEST');
    expect(buildQueryString(filters)).toContain('page=3');
  });

  it('잘못된 page 값은 1로', () => {
    expect(parseSearchParams('?page=abc').page).toBe(1);
    expect(parseSearchParams('?page=-2').page).toBe(1);
  });
});

describe('발견 장소(건물) 조건', () => {
  it('목록 전용으로 주소에 담기고 지도로 넘길 때는 빠진다', () => {
    const filters = { ...EMPTY_FILTERS, keyword: '파우치', buildingId: '3' };
    expect(buildQueryString(filters)).toContain('buildingId=3');
    expect(buildQueryString(filters, { includeListOnly: false })).not.toContain('buildingId');
  });

  it('주소에서 읽고 활성 조건으로 센다', () => {
    const filters = parseSearchParams('?buildingId=3');
    expect(filters.buildingId).toBe('3');
    expect(hasActiveFilters(filters)).toBe(true);
    expect(getActiveFilterCount(filters)).toBe(1);
    expect(parseSearchParams('').buildingId).toBe('');
  });
});
