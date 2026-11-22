import { describe, expect, it } from 'vitest';
import {
  boundsChangedMeaningfully,
  buildLostMarkerGroups,
  buildMarkerGroups,
  distanceMeters,
  findGroupKeyForItem,
  getFoundPosition,
  nearestBuilding,
} from './mapMarkers.js';

const office = { storageName: '학생지원팀 분실물 보관함', latitude: 37.49905, longitude: 126.95885 };

const items = [
  // 과업 A 정답: 발견 도서관 → 보관 행정관
  {
    itemId: 1, title: '파란색 파우치', status: 'STORED', custodyType: 'HANDED_OVER',
    markerLatitude: 37.4979, markerLongitude: 126.9566, markerApproximate: true, foundBuildingName: '도서관',
    storageInfo: office,
  },
  // 같은 도서관, 보관 장소 미확정
  {
    itemId: 2, title: '남색 파우치', status: 'REPORTED', custodyType: 'PENDING_HANDOVER',
    markerLatitude: 37.4979, markerLongitude: 126.9566, markerApproximate: true, foundBuildingName: '도서관',
  },
  // 같은 보관 장소
  {
    itemId: 3, title: '회색 가방', status: 'STORED', custodyType: 'HANDED_OVER',
    markerLatitude: 37.4972, markerLongitude: 126.958, foundBuildingName: '공학관', storageInfo: office,
  },
  // 반환 완료
  {
    itemId: 4, title: '파란색 파우치', status: 'RETURNED', custodyType: 'HANDED_OVER',
    markerLatitude: 37.4984, markerLongitude: 126.9578, foundBuildingName: '학생회관', storageInfo: office,
  },
  // 임시 보관 → 보관 마커 없음
  {
    itemId: 5, title: '갈색 카드지갑', status: 'REPORTED', custodyType: 'TEMPORARY',
    markerLatitude: 37.4984, markerLongitude: 126.9578, foundBuildingName: '학생회관',
    storageLatitude: 37.1, storageLongitude: 127.1,
  },
];

describe('buildMarkerGroups', () => {
  it('같은 지점의 발견 위치를 하나로 묶고, 발견·보관 위치를 따로 만든다', () => {
    const groups = buildMarkerGroups(items, ['FOUND', 'STORAGE']);
    const found = groups.filter((g) => g.type === 'FOUND');
    const storage = groups.filter((g) => g.type === 'STORAGE');

    const library = found.find((g) => g.label === '도서관');
    expect(library.items.map((i) => i.itemId)).toEqual([1, 2]);
    expect(library.approximate).toBe(true);

    // 보관 마커는 전달 완료이면서 반환되지 않은 물품만 (1, 3)
    expect(storage).toHaveLength(1);
    expect(storage[0].items.map((i) => i.itemId)).toEqual([1, 3]);
    expect(storage[0].label).toBe('학생지원팀 분실물 보관함');
  });

  it('반환 완료 물품은 회색으로, 선택한 종류만 보여준다', () => {
    expect(buildMarkerGroups(items, ['FOUND']).some((g) => g.items.some((i) => i.itemId === 4))).toBe(false);
    const returned = buildMarkerGroups(items, ['RETURNED']);
    expect(returned).toHaveLength(1);
    expect(returned[0].items[0].itemId).toBe(4);
  });

  it('임시 보관 물품은 보관 위치를 지도에 표시하지 않는다(개인 장소 보호)', () => {
    const storage = buildMarkerGroups(items, ['STORAGE']);
    expect(storage.some((g) => g.items.some((i) => i.itemId === 5))).toBe(false);
  });

  it('좌표가 없는 물품은 마커를 만들지 않는다', () => {
    expect(getFoundPosition({ itemId: 9 })).toBeNull();
    expect(buildMarkerGroups([{ itemId: 9, status: 'STORED' }], ['FOUND'])).toEqual([]);
  });

  it('목록에서 고른 물품의 발견 마커를 찾는다', () => {
    const groups = buildMarkerGroups(items, ['FOUND', 'STORAGE']);
    expect(findGroupKeyForItem(groups, 3)).toMatch(/^FOUND:/);
  });
});

describe('거리·영역', () => {
  it('Haversine 거리', () => {
    const d = distanceMeters({ lat: 37.4979, lng: 126.9566 }, { lat: 37.4990, lng: 126.9588 });
    expect(Math.round(d / 10) * 10).toBe(230);
  });

  it('가장 가까운 건물', () => {
    const buildings = [
      { buildingId: 1, buildingName: '도서관', latitude: 37.4979, longitude: 126.9566 },
      { buildingId: 2, buildingName: '학생회관', latitude: 37.4984, longitude: 126.9578 },
    ];
    expect(nearestBuilding({ lat: 37.49841, lng: 126.95779 }, buildings).building.buildingName).toBe('학생회관');
  });

  it('작은 흔들림은 다시 검색 대상이 아니다', () => {
    const a = { minLat: 37.49, maxLat: 37.51, minLng: 126.95, maxLng: 126.97 };
    expect(boundsChangedMeaningfully(a, { ...a, minLat: 37.4901 })).toBe(false);
    expect(boundsChangedMeaningfully(a, { minLat: 37.5, maxLat: 37.52, minLng: 126.95, maxLng: 126.97 })).toBe(true);
    expect(boundsChangedMeaningfully(null, a)).toBe(true);
  });
});

describe('분실 신고 마커', () => {
  const reports = [
    { reportId: 1, title: '파우치', markerLatitude: 37.4979, markerLongitude: 126.9566, markerApproximate: true, lostBuildingName: '도서관' },
    { reportId: 2, title: '지갑', markerLatitude: '37.4979000', markerLongitude: '126.9566000', markerApproximate: true, lostBuildingName: '도서관' },
    { reportId: 3, title: '좌표 없음', markerLatitude: null, markerLongitude: null },
  ];

  it('같은 지점의 신고는 주황색 마커 하나로 묶고, 좌표 없는 신고는 뺀다', () => {
    const groups = buildLostMarkerGroups(reports, ['FOUND', 'LOST']);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe('LOST');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[0].approximate).toBe(true);
    expect(groups[0].label).toBe('도서관');
  });

  it('분실 신고 위치를 끄면 마커 없음', () => {
    expect(buildLostMarkerGroups(reports, ['FOUND'])).toHaveLength(0);
  });
});
