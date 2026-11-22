import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../contexts/ReportFoundDraftContext.jsx';
import {
  CUSTOM,
  buildFoundItemRequest,
  describeStorage,
  draftFromFoundItem,
  formatFoundItemNumber,
  orderedPhotos,
  validateFoundReport,
} from './reportFoundForm.js';

const now = new Date(2026, 10, 21, 15, 30);

// 과업 B: 학생회관에서 주운 검은색 우산
const umbrellaDraft = () => ({
  ...createEmptyDraft(),
  categoryId: '4',
  title: '검은색 우산',
  description: '검은색 장우산, 나무 손잡이',
  foundDate: '2026-11-21',
  foundBuildingId: '2',
  foundLocationDetail: '1층 정문 우산꽂이',
  custodyType: 'PENDING_HANDOVER',
});

describe('validateFoundReport', () => {
  it('과업 B 입력은 통과한다', () => {
    expect(validateFoundReport(umbrellaDraft(), now)).toEqual({});
  });

  it('빈 폼은 필수 항목 오류를 화면 순서대로 돌려준다', () => {
    const errors = validateFoundReport({ ...createEmptyDraft(), foundDate: '' }, now);
    expect(Object.keys(errors)).toEqual(['categoryId', 'title', 'foundDate', 'foundBuildingId', 'custodyType']);
  });

  it('미래 날짜와 오늘의 미래 시각을 막는다', () => {
    expect(validateFoundReport({ ...umbrellaDraft(), foundDate: '2026-11-22' }, now).foundDate).toBeTruthy();
    expect(validateFoundReport({ ...umbrellaDraft(), foundTime: '18:00' }, now).foundTime).toBeTruthy();
  });

  it('"목록에 없음"을 고르면 장소 이름이 필요하다', () => {
    const errors = validateFoundReport({ ...umbrellaDraft(), foundBuildingId: CUSTOM }, now);
    expect(errors.foundLocation).toBeTruthy();
  });

  it('관리 부서에 전달 완료면 보관 장소가 필요하다', () => {
    const errors = validateFoundReport({ ...umbrellaDraft(), custodyType: 'HANDED_OVER' }, now);
    expect(errors.storageId).toBeTruthy();
    expect(validateFoundReport({ ...umbrellaDraft(), custodyType: 'HANDED_OVER', storageId: '3' }, now)).toEqual({});
  });
});

describe('buildFoundItemRequest', () => {
  it('건물을 고르면 건물 ID만 보내고 임의 좌표를 만들지 않는다', () => {
    const request = buildFoundItemRequest(umbrellaDraft());
    expect(request).toMatchObject({
      categoryId: 4,
      title: '검은색 우산',
      foundBuildingId: 2,
      foundLocation: null,
      foundLatitude: null,
      foundLongitude: null,
      custodyType: 'PENDING_HANDOVER',
      storageId: null,
      storageLocation: null,
    });
  });

  it('지도에서 고른 좌표는 소수점 7자리로 보낸다', () => {
    const request = buildFoundItemRequest({
      ...umbrellaDraft(),
      foundLatitude: 37.498412345678,
      foundLongitude: 126.95781234567,
    });
    expect(request.foundLatitude).toBe(37.4984123);
    expect(request.foundLongitude).toBe(126.9578123);
  });

  it('공식 보관 장소를 고르면 보관 좌표를 보내지 않는다(서버가 장소 좌표 사용)', () => {
    const request = buildFoundItemRequest({
      ...umbrellaDraft(),
      custodyType: 'HANDED_OVER',
      storageId: '3',
      storageLatitude: 37.5,
      storageLongitude: 126.9,
    });
    expect(request.storageLatitude).toBeNull();
    const custom = buildFoundItemRequest({
      ...umbrellaDraft(),
      custodyType: 'HANDED_OVER',
      storageId: CUSTOM,
      storageLocation: '학과 사무실',
      storageLatitude: 37.5,
      storageLongitude: 126.9,
    });
    expect(custom.storageLatitude).toBe(37.5);
  });

  it('전달 완료가 아니면 보관 장소 값을 보내지 않는다', () => {
    const request = buildFoundItemRequest({
      ...umbrellaDraft(),
      custodyType: 'TEMPORARY',
      storageId: '3',
      storageLocationDetail: '집',
    });
    expect(request.storageId).toBeNull();
    expect(request.storageLocationDetail).toBeNull();
  });

  it('직접 입력한 장소를 보낸다', () => {
    const request = buildFoundItemRequest({
      ...umbrellaDraft(),
      foundBuildingId: CUSTOM,
      foundLocation: ' 정문 버스정류장 ',
      custodyType: 'HANDED_OVER',
      storageId: CUSTOM,
      storageLocation: '공학관 학과 사무실',
    });
    expect(request.foundBuildingId).toBeNull();
    expect(request.foundLocation).toBe('정문 버스정류장');
    expect(request.storageId).toBeNull();
    expect(request.storageLocation).toBe('공학관 학과 사무실');
  });
});

describe('사진 순서와 표시', () => {
  it('대표 사진을 맨 앞에 둔다', () => {
    const photos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(orderedPhotos({ photos, representativePhotoId: 'c' }).map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(orderedPhotos({ photos, representativePhotoId: null }).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('공식 보관 장소 이름을 찾는다', () => {
    const draft = { ...umbrellaDraft(), custodyType: 'HANDED_OVER', storageId: '3' };
    expect(describeStorage(draft, [{ storageId: 3, storageName: '학생회관 관리실' }]).name).toBe('학생회관 관리실');
  });

  it('등록 번호 형식', () => {
    expect(formatFoundItemNumber(42)).toBe('FI-000042');
  });
});

describe('내 습득물 → 수정 폼', () => {
  it('공식 보관 장소에 맡긴 물품', () => {
    const d = draftFromFoundItem({
      categoryId: 4, title: '우산', foundDate: '2026-11-20', foundTime: '14:30:00',
      foundBuildingId: 2, foundBuildingName: '학생회관', foundLocation: '학생회관',
      custodyType: 'HANDED_OVER', storageId: 1, storageLocation: '학생회관 관리실',
    });
    expect(d.categoryId).toBe('4');
    expect(d.foundTime).toBe('14:30');
    expect(d.foundBuildingId).toBe('2');
    expect(d.foundLocation).toBe('');
    expect(d.storageId).toBe('1');
    expect(d.storageLocation).toBe('');
  });

  it('건물 없이 직접 입력한 장소, 임시 보관', () => {
    const d = draftFromFoundItem({ categoryId: 6, title: '텀블러', foundDate: '2026-11-20', foundLocation: '정문', custodyType: 'TEMPORARY' });
    expect(d.foundBuildingId).toBe(CUSTOM);
    expect(d.foundLocation).toBe('정문');
    expect(d.storageId).toBe('');
  });
});
