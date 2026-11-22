import { CustodyType } from '../constants/custodyTypes.js';
import { FoundItemStatus } from '../constants/status.js';

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** 같은 지점(약 1m 이내)을 하나로 묶기 위한 키 */
const pointKey = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

/** 발견 위치 마커 좌표(발견 좌표 → 없으면 서버가 준 건물 좌표) */
export function getFoundPosition(item) {
  const lat = toNum(item.markerLatitude ?? item.foundLatitude);
  const lng = toNum(item.markerLongitude ?? item.foundLongitude);
  if (lat === null || lng === null) return null;
  return { lat, lng, approximate: Boolean(item.markerApproximate) };
}

/** 보관 위치 마커 좌표. 관리 부서에 전달 완료일 때만 */
export function getStoragePosition(item) {
  if (item.custodyType !== CustodyType.HANDED_OVER) return null;
  const lat = toNum(item.storageInfo?.latitude ?? item.storageLatitude);
  const lng = toNum(item.storageInfo?.longitude ?? item.storageLongitude);
  if (lat === null || lng === null) return null;
  return { lat, lng, approximate: false };
}

/**
 * 물품 목록을 지도 마커 묶음으로 바꾼다. 같은 종류·같은 지점의 물품은 마커 하나로 묶는다.
 * - 반환 완료 물품: 회색(RETURNED), 발견 위치에만 표시
 * - 그 외: 빨간색(FOUND) 발견 위치 + 전달 완료면 파란색(STORAGE) 보관 위치
 *
 * @param items PublicFoundItemDTO[]
 * @param visibleTypes ['FOUND', 'STORAGE', 'RETURNED', ...]
 * @returns {{ key, type, lat, lng, approximate, label, items }[]}
 */
export function buildMarkerGroups(items, visibleTypes) {
  const visible = new Set(visibleTypes);
  const groups = new Map();

  const add = (type, pos, item, label) => {
    if (!pos || !visible.has(type)) return;
    const key = `${type}:${pointKey(pos.lat, pos.lng)}`;
    if (!groups.has(key)) {
      groups.set(key, { key, type, lat: pos.lat, lng: pos.lng, approximate: pos.approximate, label, items: [] });
    }
    const group = groups.get(key);
    if (!group.items.some((i) => i.itemId === item.itemId)) group.items.push(item);
    if (!pos.approximate) group.approximate = false;
  };

  items.forEach((item) => {
    const returned = item.status === FoundItemStatus.RETURNED;
    const found = getFoundPosition(item);
    const foundLabel = item.foundBuildingName || item.foundLocation || '';
    if (returned) {
      add('RETURNED', found, item, foundLabel);
      return;
    }
    add('FOUND', found, item, foundLabel);
    add('STORAGE', getStoragePosition(item), item, item.storageInfo?.storageName || item.storageName || item.storageLocation || '보관 장소');
  });

  return [...groups.values()];
}

/** 물품이 포함된 첫 마커 묶음의 키 (목록에서 물품을 고르면 그 마커를 강조) */
export function findGroupKeyForItem(groups, itemId, preferredType = 'FOUND') {
  const preferred = groups.find((g) => g.type === preferredType && g.items.some((i) => i.itemId === itemId));
  if (preferred) return preferred.key;
  return groups.find((g) => g.items.some((i) => i.itemId === itemId))?.key ?? null;
}

/** 두 좌표 사이 거리(m), Haversine */
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 가장 가까운 건물과 거리 (지도에서 찍은 위치를 "○○ 근처"로 보여줄 때) */
export function nearestBuilding(position, buildings) {
  let best = null;
  buildings.forEach((b) => {
    const lat = toNum(b.latitude);
    const lng = toNum(b.longitude);
    if (lat === null || lng === null) return;
    const d = distanceMeters(position, { lat, lng });
    if (!best || d < best.distance) best = { building: b, distance: d };
  });
  return best;
}

/** 지도 영역이 다시 검색할 만큼 바뀌었는지 (작은 흔들림은 무시) */
export function boundsChangedMeaningfully(prev, next) {
  if (!prev) return true;
  const latSpan = Math.max(prev.maxLat - prev.minLat, 1e-6);
  const lngSpan = Math.max(prev.maxLng - prev.minLng, 1e-6);
  const moved =
    Math.abs(prev.minLat - next.minLat) / latSpan > 0.15 ||
    Math.abs(prev.maxLat - next.maxLat) / latSpan > 0.15 ||
    Math.abs(prev.minLng - next.minLng) / lngSpan > 0.15 ||
    Math.abs(prev.maxLng - next.maxLng) / lngSpan > 0.15;
  return moved;
}

/**
 * 분실 신고 → 주황색(LOST) 마커 묶음. 같은 지점의 신고는 하나로 묶는다.
 * 지도에서 고른 지점이 없으면 서버가 대표 건물 좌표(markerApproximate)를 준다.
 * 묶음 안의 항목은 { reportId, ... } 이라 습득물 묶음과 섞이지 않는다.
 *
 * @param reports LostReportSummaryDTO[]
 */
export function buildLostMarkerGroups(reports, visibleTypes) {
  if (!visibleTypes.includes('LOST')) return [];
  const groups = new Map();
  reports.forEach((report) => {
    const lat = toNum(report.markerLatitude);
    const lng = toNum(report.markerLongitude);
    if (lat === null || lng === null) return;
    const key = `LOST:${pointKey(lat, lng)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        type: 'LOST',
        lat,
        lng,
        approximate: Boolean(report.markerApproximate),
        label: report.lostBuildingName || report.lostLocation || '',
        items: [],
      });
    }
    const group = groups.get(key);
    if (!group.items.some((r) => r.reportId === report.reportId)) group.items.push(report);
    if (!report.markerApproximate) group.approximate = false;
  });
  return [...groups.values()];
}
