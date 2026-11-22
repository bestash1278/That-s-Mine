import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getTodayDate } from '../utils/dateUtils.js';
import { revokeImagePreview } from '../utils/imageValidator.js';

/**
 * 습득물 신고 작성 중인 내용(사진 포함)을 신고 폼 → 미리보기 → 완료 화면 사이에서 유지한다.
 * File 객체와 미리보기 URL을 history state에 넣지 않고 메모리에 둔다.
 * 사진 미리보기 URL(createObjectURL)은 사진을 지우거나 초안을 비울 때 해제한다.
 */

export function createEmptyDraft() {
  return {
    categoryId: '',
    title: '',
    description: '',
    privateFeatures: '',
    foundDate: getTodayDate(),
    foundTime: '',
    foundBuildingId: '', // '' = 선택 안 함, 'custom' = 목록에 없음(직접 입력)
    foundLocation: '', // 직접 입력한 장소 이름
    foundLocationDetail: '',
    // 지도에서 고른 정확한 지점(선택). 없으면 건물만으로 신고
    foundLatitude: null,
    foundLongitude: null,
    custodyType: '',
    storageId: '', // '' | 숫자 문자열 | 'custom'
    storageLocation: '', // 직접 입력한 보관 장소 이름
    storageLocationDetail: '',
    // 공식 보관 장소가 아닌 곳에 맡겼을 때 지도에서 고른 지점(선택)
    storageLatitude: null,
    storageLongitude: null,
    photos: [], // [{ id, file, url }]
    representativePhotoId: null,
  };
}

const ReportFoundDraftContext = createContext(null);

export function ReportFoundDraftProvider({ children }) {
  const [draft, setDraft] = useState(createEmptyDraft);
  // 서버가 돌려준 항목별 오류(미리보기에서 등록 실패 시 폼에 표시)
  const [serverErrors, setServerErrors] = useState({});

  const photosRef = useRef(draft.photos);
  useEffect(() => {
    photosRef.current = draft.photos;
  }, [draft.photos]);

  // 앱이 내려갈 때 남은 미리보기 URL 해제
  useEffect(() => () => photosRef.current.forEach((photo) => revokeImagePreview(photo.url)), []);

  const updateDraft = useCallback((patch) => {
    setDraft((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  const resetDraft = useCallback(() => {
    photosRef.current.forEach((photo) => revokeImagePreview(photo.url));
    setDraft(createEmptyDraft());
    setServerErrors({});
  }, []);

  const value = useMemo(
    () => ({ draft, updateDraft, resetDraft, serverErrors, setServerErrors }),
    [draft, updateDraft, resetDraft, serverErrors],
  );

  return <ReportFoundDraftContext.Provider value={value}>{children}</ReportFoundDraftContext.Provider>;
}

export function useReportFoundDraft() {
  const context = useContext(ReportFoundDraftContext);
  if (!context) {
    throw new Error('useReportFoundDraft는 ReportFoundDraftProvider 안에서 사용해야 합니다.');
  }
  return context;
}

/** 작성 중인 내용이 있는지(취소 확인용) */
export function hasDraftContent(draft) {
  return Boolean(
    draft.title ||
      draft.description ||
      draft.privateFeatures ||
      draft.foundLocation ||
      draft.foundLocationDetail ||
      draft.foundBuildingId ||
      draft.categoryId ||
      draft.custodyType ||
      draft.photos.length > 0,
  );
}
