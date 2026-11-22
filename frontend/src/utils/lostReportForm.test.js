import { describe, expect, it } from 'vitest';
import {
  CUSTOM,
  DateMode,
  buildLostReportRequest,
  draftFromQuery,
  draftFromReport,
  emptyLostDraft,
  formatLostPeriod,
  validateLostReport,
} from './lostReportForm.js';
import { formatDate } from './dateUtils.js';

const NOW = new Date(2026, 10, 21, 14, 0); // 2026-11-21 14:00 (로컬)

const valid = () => ({
  ...emptyLostDraft(),
  categoryId: '4',
  title: '파란색 파우치',
  lostDate: '2026-11-19',
  lostBuildingId: '1',
});

describe('조회 결과 없음 → 분실 신고 초기값', () => {
  it('검색어·카테고리·기간을 채운다', () => {
    const d = draftFromQuery(new URLSearchParams('keyword=파우치&categoryId=4&startDate=2026-11-18&endDate=2026-11-20'), NOW);
    expect(d.title).toBe('파우치');
    expect(d.categoryId).toBe('4');
    expect(d.dateMode).toBe(DateMode.RANGE);
    expect(d.lostDate).toBe('2026-11-18');
    expect(d.lostEndDate).toBe('2026-11-20');
  });

  it('예전 형식(date)도 받고, 하루면 단일 날짜', () => {
    const d = draftFromQuery(new URLSearchParams('date=2026-11-20'), NOW);
    expect(d.dateMode).toBe(DateMode.SINGLE);
    expect(d.lostDate).toBe('2026-11-20');
  });

  it('미래 날짜와 잘못된 값은 버린다', () => {
    const d = draftFromQuery(new URLSearchParams('startDate=2026-12-01&categoryId=abc'), NOW);
    expect(d.lostDate).toBe('');
    expect(d.categoryId).toBe('');
  });
});

describe('분실 신고 검증', () => {
  it('필수 항목이 있으면 오류 없음', () => {
    expect(validateLostReport(valid(), NOW)).toEqual({});
  });

  it('대표 위치가 없으면 오류', () => {
    const e = validateLostReport({ ...valid(), lostBuildingId: '' }, NOW);
    expect(Object.keys(e)).toContain('lostBuildingId');
  });

  it('직접 입력을 골랐으면 장소 이름 필요', () => {
    const e = validateLostReport({ ...valid(), lostBuildingId: CUSTOM }, NOW);
    expect(Object.keys(e)).toContain('lostLocation');
  });

  it('기간: 끝이 시작보다 빠르면 오류, 오늘까지는 허용', () => {
    const reversed = { ...valid(), dateMode: DateMode.RANGE, lostDate: '2026-11-20', lostEndDate: '2026-11-18' };
    expect(Object.keys(validateLostReport(reversed, NOW))).toContain('lostEndDate');
    const today = { ...valid(), dateMode: DateMode.RANGE, lostDate: '2026-11-18', lostEndDate: '2026-11-21' };
    expect(validateLostReport(today, NOW)).toEqual({});
  });

  it('미래 날짜는 오류', () => {
    expect(Object.keys(validateLostReport({ ...valid(), lostDate: '2026-11-22' }, NOW))).toContain('lostDate');
  });
});

describe('요청 만들기', () => {
  it('단일 날짜면 lostEndDate는 null, 건물 선택이면 lostBuildingId', () => {
    const r = buildLostReportRequest({ ...valid(), lostEndDate: '2026-11-20' });
    expect(r.lostEndDate).toBeNull();
    expect(r.lostBuildingId).toBe(1);
    expect(r.categoryId).toBe(4);
  });

  it('직접 입력이면 lostBuildingId 없이 이름만', () => {
    const r = buildLostReportRequest({ ...valid(), lostBuildingId: CUSTOM, lostLocation: ' 정문 버스정류장 ' });
    expect(r.lostBuildingId).toBeNull();
    expect(r.lostLocation).toBe('정문 버스정류장');
  });
});

describe('수정 폼 채우기', () => {
  it('건물 없이 저장된 신고는 직접 입력으로', () => {
    const d = draftFromReport({ categoryId: 2, title: '지갑', lostDate: '2026-11-20', lostLocation: '정문' });
    expect(d.lostBuildingId).toBe(CUSTOM);
    expect(d.lostLocation).toBe('정문');
  });

  it('기간이 있으면 기간 입력으로', () => {
    const d = draftFromReport({ categoryId: 2, title: '지갑', lostDate: '2026-11-18', lostEndDate: '2026-11-20', lostBuildingId: 3, lostBuildingName: '도서관', lostLocation: '도서관' });
    expect(d.dateMode).toBe(DateMode.RANGE);
    expect(d.lostBuildingId).toBe('3');
    expect(d.lostLocation).toBe('');
  });
});

describe('기간 표시', () => {
  it('하루면 날짜만, 기간이면 ~ 사이', () => {
    expect(formatLostPeriod('2026-11-20', null, formatDate)).toBe('2026년 11월 20일 (금)');
    expect(formatLostPeriod('2026-11-18', '2026-11-20', formatDate)).toBe('2026년 11월 18일 (수) ~ 11월 20일 (금) 사이');
  });
});
