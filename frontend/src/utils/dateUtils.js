// 날짜는 'YYYY-MM-DD', 시간은 'HH:mm' 문자열로 다룬다.
// new Date('YYYY-MM-DD')는 UTC 자정으로 해석되어 한국 시간에서는 하루가 어긋나므로 쓰지 않는다.

const pad = (n) => String(n).padStart(2, '0');

/** 사용자 기기의 오늘 날짜 (로컬 기준) */
export function getTodayDate(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 현재 시각 'HH:mm' (로컬 기준) */
export function getCurrentTime(now = new Date()) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** 오늘보다 뒤의 날짜인가 (오늘은 미래가 아님) */
export function isFutureDate(dateStr, now = new Date()) {
  if (!isValidDate(dateStr)) return false;
  return dateStr > getTodayDate(now);
}

/** 오늘 날짜이면서 현재 시각보다 뒤의 시간인가 */
export function isFutureDateTime(dateStr, timeStr, now = new Date()) {
  if (isFutureDate(dateStr, now)) return true;
  if (!timeStr || dateStr !== getTodayDate(now)) return false;
  return timeStr > getCurrentTime(now);
}

export function validateCoordinates(lat, lng) {
  if (lat === null || lng === null || lat === undefined || lng === undefined) {
    return { valid: false, error: '위치를 선택해 주세요.' };
  }
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return { valid: false, error: '올바른 좌표가 아닙니다.' };
  }
  if (latNum < -90 || latNum > 90) {
    return { valid: false, error: '위도 범위를 벗어났습니다. (-90 ~ 90)' };
  }
  if (lngNum < -180 || lngNum > 180) {
    return { valid: false, error: '경도 범위를 벗어났습니다. (-180 ~ 180)' };
  }
  return { valid: true, error: null };
}

/** 'YYYY-MM-DD' → '2026년 11월 21일 (토)' */
export function formatDate(value) {
  // '2026-11-21T10:00:00' 같은 일시 문자열도 날짜 부분만 쓴다.
  const dateStr = typeof value === 'string' ? value.slice(0, 10) : '';
  if (!isValidDate(dateStr)) return value || '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

/** 'HH:mm' 또는 'HH:mm:ss' → '오후 3:20' */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${pad(m)}`;
}
