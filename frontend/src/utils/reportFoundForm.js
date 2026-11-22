import { CustodyType } from '../constants/custodyTypes.js';
import { isFutureDate, isFutureDateTime, isValidDate } from './dateUtils.js';
import { IMAGE_CONSTRAINTS } from './imageValidator.js';

export const CUSTOM = 'custom';

/** 오류를 보여줄 순서(화면 위에서 아래). 첫 오류로 포커스를 옮길 때 쓴다. */
export const FIELD_ORDER = [
  'categoryId',
  'title',
  'description',
  'privateFeatures',
  'foundDate',
  'foundTime',
  'foundBuildingId',
  'foundLocation',
  'foundLocationDetail',
  'images',
  'custodyType',
  'storageId',
  'storageLocation',
  'storageLocationDetail',
];

/** 각 항목의 화면 이름(오류 요약에 표시) */
export const FIELD_LABELS = {
  categoryId: '물품 종류',
  title: '물품명',
  description: '물품 특징',
  privateFeatures: '비공개 특징',
  foundDate: '발견 날짜',
  foundTime: '발견 시간',
  foundBuildingId: '발견 건물',
  foundLocation: '발견 장소',
  foundLocationDetail: '상세 위치',
  foundCoordinates: '발견 위치 좌표',
  images: '사진',
  custodyType: '보관 상태',
  storageId: '보관 장소',
  storageLocation: '보관 장소',
  storageLocationDetail: '보관 장소 설명',
  storageCoordinates: '보관 위치 좌표',
};

/**
 * 신고 폼 검증. 서버(FoundItemService)와 같은 규칙.
 * @returns {Record<string, string>} 항목별 오류 메시지 (FIELD_ORDER 순서)
 */
export function validateFoundReport(draft, now = new Date()) {
  const e = {};
  const title = draft.title.trim();

  if (!draft.categoryId) e.categoryId = '물품 종류를 선택해 주세요.';
  if (!title) e.title = '물품명을 입력해 주세요.';
  else if (title.length > 100) e.title = '물품명은 100자 이하로 입력해 주세요.';
  if (draft.description.length > 1000) e.description = '물품 특징은 1000자 이하로 입력해 주세요.';
  if (draft.privateFeatures.length > 1000) e.privateFeatures = '비공개 특징은 1000자 이하로 입력해 주세요.';

  if (!draft.foundDate) e.foundDate = '발견 날짜를 입력해 주세요.';
  else if (!isValidDate(draft.foundDate)) e.foundDate = '발견 날짜 형식이 올바르지 않습니다.';
  else if (isFutureDate(draft.foundDate, now)) e.foundDate = '발견 날짜는 오늘 이후일 수 없습니다.';
  else if (isFutureDateTime(draft.foundDate, draft.foundTime, now)) {
    e.foundTime = '발견 시간은 현재 시각 이후일 수 없습니다.';
  }

  if (!draft.foundBuildingId) {
    e.foundBuildingId = '발견한 건물을 선택해 주세요. 목록에 없으면 "목록에 없음"을 고르세요.';
  } else if (draft.foundBuildingId === CUSTOM && !draft.foundLocation.trim()) {
    e.foundLocation = '발견한 장소 이름을 입력해 주세요.';
  }
  if (draft.foundLocation.length > 255 || draft.foundLocationDetail.length > 255) {
    e.foundLocationDetail = '위치 설명은 255자 이하로 입력해 주세요.';
  }

  if ((draft.foundLatitude == null) !== (draft.foundLongitude == null)) {
    e.foundLocationDetail = '지도에서 고른 위치가 올바르지 않습니다. 위치를 다시 선택해 주세요.';
  }

  if (draft.photos.length > IMAGE_CONSTRAINTS.maxCount) {
    e.images = `사진은 최대 ${IMAGE_CONSTRAINTS.maxCount}장까지 등록할 수 있습니다.`;
  }

  if (!draft.custodyType) {
    e.custodyType = '물건을 지금 어떻게 보관하고 있는지 선택해 주세요.';
  } else if (draft.custodyType === CustodyType.HANDED_OVER) {
    if (!draft.storageId) e.storageId = '물건을 맡긴 보관 장소를 선택해 주세요.';
    else if (draft.storageId === CUSTOM && !draft.storageLocation.trim()) {
      e.storageLocation = '맡긴 보관 장소 이름을 입력해 주세요.';
    }
    if (draft.storageLocation.length > 255 || draft.storageLocationDetail.length > 255) {
      e.storageLocationDetail = '보관 장소 설명은 255자 이하로 입력해 주세요.';
    }
  }

  return Object.fromEntries(FIELD_ORDER.filter((key) => e[key]).map((key) => [key, e[key]]));
}

/** 대표 사진을 맨 앞에 둔 사진 목록 */
export function orderedPhotos(draft) {
  const rep = draft.photos.find((p) => p.id === draft.representativePhotoId);
  if (!rep) return draft.photos;
  return [rep, ...draft.photos.filter((p) => p.id !== rep.id)];
}

const coord = (v) => (v === null || v === undefined || v === '' ? null : Number(Number(v).toFixed(7)));

/**
 * 폼 내용을 서버 요청(CreateFoundItemRequest) 형태로 바꾼다.
 * 좌표는 사용자가 지도에서 직접 고른 경우에만 보낸다. 임의 좌표를 만들지 않는다.
 */
export function buildFoundItemRequest(draft) {
  const isCustomBuilding = draft.foundBuildingId === CUSTOM;
  const handedOver = draft.custodyType === CustodyType.HANDED_OVER;
  const isCustomStorage = draft.storageId === CUSTOM;
  const blankToNull = (v) => (v && v.trim() ? v.trim() : null);

  return {
    categoryId: Number(draft.categoryId),
    title: draft.title.trim(),
    description: blankToNull(draft.description),
    privateFeatures: blankToNull(draft.privateFeatures),
    foundDate: draft.foundDate,
    foundTime: draft.foundTime || null,
    foundBuildingId: draft.foundBuildingId && !isCustomBuilding ? Number(draft.foundBuildingId) : null,
    foundLocation: isCustomBuilding ? blankToNull(draft.foundLocation) : null,
    foundLocationDetail: blankToNull(draft.foundLocationDetail),
    foundLatitude: coord(draft.foundLatitude),
    foundLongitude: coord(draft.foundLongitude),
    custodyType: draft.custodyType,
    storageId: handedOver && draft.storageId && !isCustomStorage ? Number(draft.storageId) : null,
    storageLocation: handedOver && isCustomStorage ? blankToNull(draft.storageLocation) : null,
    storageLocationDetail: handedOver ? blankToNull(draft.storageLocationDetail) : null,
    // 공식 보관 장소는 서버가 그 장소의 좌표를 쓴다
    storageLatitude: handedOver && isCustomStorage ? coord(draft.storageLatitude) : null,
    storageLongitude: handedOver && isCustomStorage ? coord(draft.storageLongitude) : null,
    // 사진은 대표 사진을 맨 앞에 두고 보내므로 항상 0
    representativeImageIndex: 0,
  };
}

/** 미리보기·확인 화면용 표시 값 */
export function describeFoundLocation(draft, buildings) {
  if (draft.foundBuildingId === CUSTOM) return draft.foundLocation.trim();
  const building = buildings.find((b) => String(b.buildingId) === String(draft.foundBuildingId));
  return building?.buildingName || '';
}

export function describeStorage(draft, storageLocations) {
  if (draft.custodyType !== CustodyType.HANDED_OVER) return null;
  if (draft.storageId === CUSTOM) return { name: draft.storageLocation.trim(), official: null };
  const storage = storageLocations.find((s) => String(s.storageId) === String(draft.storageId));
  return storage ? { name: storage.storageName, official: storage } : null;
}

/** 등록 번호 표시 형식: FI-000123 */
export function formatFoundItemNumber(id) {
  return `FI-${String(id).padStart(6, '0')}`;
}

/**
 * 내 습득물 상세(MyFoundItemDetailDTO) → 수정 폼 값 (사진은 화면에서 따로 채운다)
 * 신고 폼과 같은 모양이라 validateFoundReport·buildFoundItemRequest를 그대로 쓴다.
 */
export function draftFromFoundItem(item) {
  const time = item.foundTime ? String(item.foundTime).slice(0, 5) : '';
  const hasBuilding = item.foundBuildingId != null;
  const handedOver = item.custodyType === CustodyType.HANDED_OVER;
  const officialStorage = handedOver && item.storageId != null;
  return {
    categoryId: item.categoryId != null ? String(item.categoryId) : '',
    title: item.title || '',
    description: item.description || '',
    privateFeatures: item.privateFeatures || '',
    foundDate: item.foundDate || '',
    foundTime: time,
    foundBuildingId: hasBuilding ? String(item.foundBuildingId) : CUSTOM,
    // 건물을 고른 신고는 서버가 건물 이름을 장소 이름으로 저장하므로, 다르게 적은 경우만 남긴다
    foundLocation: hasBuilding
      ? item.foundLocation && item.foundLocation !== item.foundBuildingName
        ? item.foundLocation
        : ''
      : item.foundLocation || '',
    foundLocationDetail: item.foundLocationDetail || '',
    foundLatitude: item.foundLatitude ?? null,
    foundLongitude: item.foundLongitude ?? null,
    custodyType: item.custodyType || '',
    storageId: officialStorage ? String(item.storageId) : handedOver ? CUSTOM : '',
    storageLocation: handedOver && !officialStorage ? item.storageLocation || '' : '',
    storageLocationDetail: handedOver ? item.storageLocationDetail || '' : '',
    storageLatitude: handedOver && !officialStorage ? (item.storageLatitude ?? null) : null,
    storageLongitude: handedOver && !officialStorage ? (item.storageLongitude ?? null) : null,
    photos: [],
    representativePhotoId: null,
  };
}
