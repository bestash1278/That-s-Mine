import { describe, expect, it } from 'vitest';
import { formatDate, formatTime, getTodayDate, isFutureDate, isFutureDateTime, isValidDate } from './dateUtils.js';

// 2026-11-21 (토) 15:30, 기기 로컬 시간 기준
const now = new Date(2026, 10, 21, 15, 30);

describe('dateUtils', () => {
  it('오늘 날짜를 로컬 기준 YYYY-MM-DD로 만든다', () => {
    expect(getTodayDate(now)).toBe('2026-11-21');
  });

  it('오늘은 미래 날짜가 아니다 (UTC 해석으로 하루 밀리던 버그 회귀 방지)', () => {
    expect(isFutureDate('2026-11-21', now)).toBe(false);
    expect(isFutureDate('2026-11-20', now)).toBe(false);
    expect(isFutureDate('2026-11-22', now)).toBe(true);
  });

  it('오늘 날짜의 미래 시각을 막는다', () => {
    expect(isFutureDateTime('2026-11-21', '15:00', now)).toBe(false);
    expect(isFutureDateTime('2026-11-21', '16:00', now)).toBe(true);
    expect(isFutureDateTime('2026-11-20', '23:59', now)).toBe(false);
    expect(isFutureDateTime('2026-11-21', '', now)).toBe(false);
  });

  it('없는 날짜를 거른다', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-11-21')).toBe(true);
    expect(isValidDate('')).toBe(false);
  });

  it('날짜·시간을 한국어로 표시한다', () => {
    expect(formatDate('2026-11-21')).toBe('2026년 11월 21일 (토)');
    expect(formatDate('2026-11-21T09:00:00')).toBe('2026년 11월 21일 (토)');
    expect(formatTime('15:20')).toBe('오후 3:20');
    expect(formatTime('00:05:00')).toBe('오전 12:05');
  });
});
