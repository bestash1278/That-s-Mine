import { CUSTOM } from './reportFoundForm.js';
import { getTodayDate, isFutureDate, isValidDate } from './dateUtils.js';
import { IMAGE_CONSTRAINTS } from './imageValidator.js';

export { CUSTOM };

/** 날짜 입력 방식 */
export const DateMode = { SINGLE: 'single', RANGE: 'range' };

export const FIELD_ORDER = [
  'categoryId',
  'title',
  'description',
  'lostDate',
  'lostEndDate',
  'lostBuildingId',
  'lostLocation',
  'lostLocationDetail',
  'images',
];

export const FIELD_LABELS = {
  categoryId: '물품 종류',
  title: '물품명',
  description: '물품 특징',
  lostDate: '잃어버린 날짜',
  lostEndDate: '기간 끝 날짜',
  lostBuildingId: '대표 추정 위치',
  lostLocation: '대표 추정 위치',
  lostLocationDetail: '추가 설명',
  lostCoordinates: '지도 위치',
  images: '사진',
};

export function emptyLostDraft() {
  return {
    categoryId: '',
    title: '',
    description: '',
    dateMode: DateMode.SINGLE,
    lostDate: '',
    lostEndDate: '',
    lostBuildingId: '',
    lostLocation: '',
    lostLocationDetail: '',
    lostLatitude: null,
    lostLongitude: null,
    photos: [],
    representativePhotoId: null,
  };
}

const validOrEmpty = (v) => (isValidDate(v || '') ? v : '');

/**
 * 조회 결과 없음 화면에서 넘어온 검색 조건을 폼 초기값으로 (C03, I03)
 * 받는 값: keyword, categoryId, startDate, endDate (이전 형식 date도 허용)
 */
export function draftFromQuery(searchParams, now = new Date()) {
  const get = (k) => (searchParams.get(k) || '').trim();
  const draft = emptyLostDraft();
  draft.title = get('keyword').slice(0, 100);
  if (/^\d+$/.test(get('categoryId'))) draft.categoryId = get('categoryId');

  const today = getTodayDate(now);
  // 검색 조건의 날짜가 미래면 쓰지 않는다(분실 날짜는 오늘 이후일 수 없음)
  const notFuture = (v) => (v && v <= today ? v : '');
  const start = notFuture(validOrEmpty(get('startDate') || get('date')));
  const end = notFuture(validOrEmpty(get('endDate')));
  if (start && end && end > start) {
    draft.dateMode = DateMode.RANGE;
    draft.lostDate = start;
    draft.lostEndDate = end;
  } else if (start || end) {
    draft.lostDate = start || end;
  }
  return draft;
}

/** 서버의 LostReportDTO → 수정 폼 (사진은 화면에서 따로 채운다) */
export function draftFromReport(report) {
  const draft = emptyLostDraft();
  draft.categoryId = report.categoryId != null ? String(report.categoryId) : '';
  draft.title = report.title || '';
  draft.description = report.description || '';
  draft.lostDate = report.lostDate || '';
  draft.lostEndDate = report.lostEndDate || '';
  draft.dateMode = report.lostEndDate ? DateMode.RANGE : DateMode.SINGLE;
  if (report.lostBuildingId != null) {
    draft.lostBuildingId = String(report.lostBuildingId);
    // 건물 이름과 다르게 직접 적은 장소 이름이 있으면 지우지 않는다
    draft.lostLocation = report.lostLocation && report.lostLocation !== report.lostBuildingName ? report.lostLocation : '';
  } else {
    draft.lostBuildingId = CUSTOM;
    draft.lostLocation = report.lostLocation || '';
  }
  draft.lostLocationDetail = report.lostLocationDetail || '';
  draft.lostLatitude = report.lostLatitude ?? null;
  draft.lostLongitude = report.lostLongitude ?? null;
  return draft;
}

/** 서버(LostReportService.validate)와 같은 규칙 */
export function validateLostReport(draft, now = new Date()) {
  const e = {};
  const title = draft.title.trim();
  if (!draft.categoryId) e.categoryId = '물품 종류를 선택해 주세요.';
  if (!title) e.title = '물품명을 입력해 주세요.';
  else if (title.length > 100) e.title = '물품명은 100자 이하로 입력해 주세요.';
  if (draft.description.length > 1000) e.description = '물품 특징은 1000자 이하로 입력해 주세요.';

  const range = draft.dateMode === DateMode.RANGE;
  if (!draft.lostDate) {
    e.lostDate = range ? '기간의 시작 날짜를 입력해 주세요.' : '잃어버린 날짜를 입력해 주세요. 정확하지 않으면 "기간으로 입력"을 고르세요.';
  } else if (!isValidDate(draft.lostDate)) {
    e.lostDate = '날짜 형식이 올바르지 않습니다.';
  } else if (isFutureDate(draft.lostDate, now)) {
    e.lostDate = '잃어버린 날짜는 오늘 이후일 수 없습니다.';
  } else if (range) {
    if (!draft.lostEndDate) e.lostEndDate = '기간의 끝 날짜를 입력해 주세요.';
    else if (!isValidDate(draft.lostEndDate)) e.lostEndDate = '날짜 형식이 올바르지 않습니다.';
    else if (draft.lostEndDate < draft.lostDate) e.lostEndDate = '끝 날짜는 시작 날짜보다 빠를 수 없습니다.';
    else if (isFutureDate(draft.lostEndDate, now)) e.lostEndDate = '끝 날짜는 오늘 이후일 수 없습니다.';
  }

  if (!draft.lostBuildingId) {
    e.lostBuildingId = '잃어버렸을 것 같은 대표 장소를 하나 골라 주세요. 목록에 없으면 "목록에 없음"을 고르세요.';
  } else if (draft.lostBuildingId === CUSTOM && !draft.lostLocation.trim()) {
    e.lostLocation = '장소 이름을 입력해 주세요.';
  }
  if (draft.lostLocation.length > 255) e.lostLocation = '장소 이름은 255자 이하로 입력해 주세요.';
  if (draft.lostLocationDetail.length > 255) e.lostLocationDetail = '추가 설명은 255자 이하로 입력해 주세요.';
  if ((draft.lostLatitude == null) !== (draft.lostLongitude == null)) {
    e.lostLocationDetail = '지도에서 고른 위치가 올바르지 않습니다. 위치를 다시 선택해 주세요.';
  }
  if (draft.photos.length > IMAGE_CONSTRAINTS.maxCount) {
    e.images = `사진은 최대 ${IMAGE_CONSTRAINTS.maxCount}장까지 등록할 수 있습니다.`;
  }
  return Object.fromEntries(FIELD_ORDER.filter((k) => e[k]).map((k) => [k, e[k]]));
}

const coord = (v) => (v === null || v === undefined || v === '' ? null : Number(Number(v).toFixed(7)));
const blankToNull = (v) => (v && v.trim() ? v.trim() : null);

/** 폼 → LostReportRequest (사진 구성은 호출하는 쪽에서 더한다) */
export function buildLostReportRequest(draft) {
  const custom = draft.lostBuildingId === CUSTOM;
  const range = draft.dateMode === DateMode.RANGE;
  return {
    categoryId: Number(draft.categoryId),
    title: draft.title.trim(),
    description: blankToNull(draft.description),
    lostDate: draft.lostDate,
    lostEndDate: range && draft.lostEndDate && draft.lostEndDate !== draft.lostDate ? draft.lostEndDate : null,
    lostBuildingId: draft.lostBuildingId && !custom ? Number(draft.lostBuildingId) : null,
    lostLocation: blankToNull(draft.lostLocation),
    lostLocationDetail: blankToNull(draft.lostLocationDetail),
    lostLatitude: coord(draft.lostLatitude),
    lostLongitude: coord(draft.lostLongitude),
  };
}

/** '2026년 11월 19일 (목) ~ 11월 21일 (토)' 처럼 기간 표시 */
export function formatLostPeriod(lostDate, lostEndDate, formatDate) {
  if (!lostDate) return '';
  if (!lostEndDate || lostEndDate === lostDate) return formatDate(lostDate);
  const sameYear = lostDate.slice(0, 4) === lostEndDate.slice(0, 4);
  const end = formatDate(lostEndDate);
  return `${formatDate(lostDate)} ~ ${sameYear ? end.replace(/^\d{4}년 /, '') : end} 사이`;
}

/** 대표 위치 표시: 건물 이름(+ 직접 적은 이름) */
export function describeLostLocation(report) {
  if (!report) return '';
  if (report.lostBuildingName && report.lostLocation && report.lostLocation !== report.lostBuildingName) {
    return `${report.lostBuildingName} · ${report.lostLocation}`;
  }
  return report.lostBuildingName || report.lostLocation || '';
}
