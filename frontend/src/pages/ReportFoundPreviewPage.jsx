import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, Lock, MapPin } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import LocationCard from '../components/common/LocationCard.jsx';
import { createFoundItem } from '../api/foundItems.js';
import { toUserError } from '../api/client.js';
import { CustodyType, getCustodyTypeLabel } from '../constants/custodyTypes.js';
import { useReportFoundDraft } from '../contexts/ReportFoundDraftContext.jsx';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { formatDate, formatTime } from '../utils/dateUtils.js';
import {
  CUSTOM,
  buildFoundItemRequest,
  describeFoundLocation,
  describeStorage,
  orderedPhotos,
  validateFoundReport,
} from '../utils/reportFoundForm.js';

function Row({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div>
      <dt className="text-sm text-sub">{label}</dt>
      <dd className="font-medium text-text">{children}</dd>
    </div>
  );
}

export default function ReportFoundPreviewPage() {
  const navigate = useNavigate();
  const { draft, resetDraft, setServerErrors } = useReportFoundDraft();
  const { categories, buildings, storageLocations } = useReferenceData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const submittingRef = useRef(false);

  // 새로고침 등으로 작성 내용이 없거나, 아직 검증을 통과하지 못한 상태로 들어온 경우
  const invalid = Object.keys(validateFoundReport(draft)).length > 0;
  if (invalid) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8 text-center">
        <p className="text-lg text-text">확인할 신고 내용이 없습니다.</p>
        <p className="text-sm text-sub">작성 중이던 내용은 페이지를 새로 고치면 지워질 수 있어요.</p>
        <Button onClick={() => navigate('/report-found')} className="w-full">
          습득물 신고 작성하기
        </Button>
      </div>
    );
  }

  const categoryName =
    categories.find((c) => String(c.categoryId) === String(draft.categoryId))?.categoryName || '';
  const foundPlace = describeFoundLocation(draft, buildings);
  const storage = describeStorage(draft, storageLocations);
  const photos = orderedPhotos(draft);
  const sameBuilding =
    storage?.official &&
    draft.foundBuildingId !== CUSTOM &&
    storage.official.buildingName &&
    storage.official.buildingName === foundPlace;

  const handleSubmit = async () => {
    if (submittingRef.current) return; // 중복 제출 방지
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const item = await createFoundItem(
        buildFoundItemRequest(draft),
        photos.map((p) => p.file),
      );
      if (!item?.itemId) {
        throw new Error('등록 결과에 물품 번호가 없습니다.');
      }
      resetDraft();
      navigate(`/report-found/complete/${item.itemId}`, { replace: true, state: { item } });
    } catch (error) {
      const { message, fieldErrors } = toUserError(error, '등록 중 문제가 발생했습니다. 다시 시도해 주세요.');
      if (Object.keys(fieldErrors).length > 0) {
        setServerErrors(fieldErrors);
      }
      setSubmitError({ message, hasFieldErrors: Object.keys(fieldErrors).length > 0 });
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-36 lg:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text">신고 내용 확인</h1>
        <p className="mt-1 text-sm text-sub">아래 내용이 맞는지 확인한 뒤 등록해 주세요. 아직 등록되지 않았어요.</p>
      </div>

      {submitError && (
        <div role="alert" className="space-y-3 rounded-lg border-l-4 border-error bg-red-50 p-4">
          <p className="font-medium text-error">등록하지 못했습니다.</p>
          <p className="text-sm text-error">{submitError.message}</p>
          <p className="text-sm text-text">입력한 내용은 그대로 남아 있어요.</p>
          {submitError.hasFieldErrors && (
            <Button variant="outline" onClick={() => navigate('/report-found')}>
              틀린 항목 고치러 가기
            </Button>
          )}
        </div>
      )}

      <Card className="space-y-3">
        <h2 className="font-bold text-text">물품 정보</h2>
        <dl className="space-y-2">
          <Row label="물품 종류">{categoryName}</Row>
          <Row label="물품명">{draft.title.trim()}</Row>
          <Row label="물품 특징">{draft.description.trim()}</Row>
        </dl>
        {draft.privateFeatures.trim() && (
          <p className="flex items-center gap-1 rounded bg-blue-50 p-2 text-sm text-primary">
            <Lock size={14} aria-hidden="true" /> 비공개 특징을 입력했어요. 다른 사용자에게는 보이지 않아요.
          </p>
        )}
      </Card>

      <LocationCard icon={MapPin} color="text-error" title="발견한 곳">
        <dl className="space-y-2">
          <Row label="발견 날짜">
            {formatDate(draft.foundDate)}
            {draft.foundTime && ` ${formatTime(draft.foundTime)}`}
          </Row>
          <Row label="발견 장소">{foundPlace}</Row>
          <Row label="상세 위치">{draft.foundLocationDetail.trim()}</Row>
          <Row label="지도 위치">
            {draft.foundLatitude != null ? '지도에서 지정함' : '지정 안 함 (건물 위치로 표시돼요)'}
          </Row>
        </dl>
      </LocationCard>

      <LocationCard icon={Archive} color="text-primary" title="지금 보관 중인 곳">
        <dl className="space-y-2">
          <Row label="보관 상태">{getCustodyTypeLabel(draft.custodyType)}</Row>
          {draft.custodyType === CustodyType.HANDED_OVER && storage && (
            <>
              <Row label="보관 장소">{storage.name}</Row>
              <Row label="위치">{storage.official?.detailLocation}</Row>
              <Row label="운영 시간">{storage.official?.operatingHours}</Row>
              <Row label="보관 장소 설명">{draft.storageLocationDetail.trim()}</Row>
            </>
          )}
          {draft.custodyType === CustodyType.PENDING_HANDOVER && <Row label="보관 장소">보관 장소 확인 중</Row>}
          {draft.custodyType === CustodyType.TEMPORARY && (
            <Row label="공개되는 내용">습득자가 임시 보관 중 (연락처 비공개)</Row>
          )}
        </dl>
        {sameBuilding && <p className="text-sm text-sub">발견한 곳과 같은 건물에 보관 중이에요.</p>}
      </LocationCard>

      <Card className="space-y-3">
        <h2 className="font-bold text-text">사진 {photos.length > 0 ? `(${photos.length}장)` : ''}</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-sub">등록한 사진이 없어요.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <li key={photo.id} className="relative overflow-hidden rounded bg-gray-100">
                <img src={photo.url} alt={`등록할 사진 ${index + 1}`} className="h-24 w-full object-cover md:h-36" />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-2 py-0.5 text-xs text-white">대표</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-gray-200 bg-white p-3 shadow-lg lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Link
            to="/report-found"
            aria-disabled={isSubmitting}
            onClick={(e) => isSubmitting && e.preventDefault()}
            className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded border-2 border-primary px-4 font-medium text-primary hover:bg-blue-50 lg:flex-none lg:px-8 ${
              isSubmitting ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            수정하기
          </Link>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex-[2]" aria-busy={isSubmitting}>
            {isSubmitting ? '등록하는 중…' : submitError ? '다시 등록하기' : '최종 등록'}
          </Button>
        </div>
      </div>
    </div>
  );
}
