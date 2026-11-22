import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Info, Lock } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Modal from '../components/common/Modal.jsx';
import FileUploadPreview from '../components/common/FileUploadPreview.jsx';
import ChoiceGroup from '../components/found-item/ChoiceGroup.jsx';
import MapLocationPicker from '../components/map/MapLocationPicker.jsx';
import FormSection from '../components/found-item/FormSection.jsx';
import { CUSTODY_TYPE_OPTIONS, CustodyType } from '../constants/custodyTypes.js';
import { hasDraftContent, useReportFoundDraft } from '../contexts/ReportFoundDraftContext.jsx';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { getCurrentTime, getTodayDate } from '../utils/dateUtils.js';
import { getImagePreview, revokeImagePreview } from '../utils/imageValidator.js';
import { CUSTOM, FIELD_LABELS, validateFoundReport } from '../utils/reportFoundForm.js';
import PickedLocation from '../components/map/PickedLocation.jsx';

let photoSeq = 0;

/** 오류 항목으로 화면을 옮기고 포커스를 준다 */
function focusField(key) {
  const el = document.getElementById(key) || document.querySelector(`[data-field="${key}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

export default function ReportFoundPage() {
  const navigate = useNavigate();
  const { draft, updateDraft, resetDraft, serverErrors, setServerErrors } = useReportFoundDraft();
  const { loading, error: refError, categories, buildings, storageLocations } = useReferenceData();

  const [errors, setErrors] = useState(serverErrors);
  const [showPrivate, setShowPrivate] = useState(Boolean(draft.privateFeatures));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // null | 'found' | 'storage'
  const summaryRef = useRef(null);

  // 미리보기에서 서버 오류로 돌아온 경우 오류 요약으로 이동
  useEffect(() => {
    if (Object.keys(serverErrors).length > 0) {
      summaryRef.current?.focus();
      setServerErrors({});
    }
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 건물 목록을 못 불러왔으면 직접 입력으로 전환
  const noBuildings = !loading && buildings.length === 0;
  const noStorages = !loading && storageLocations.length === 0;

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };
  const set = (field) => (value) => {
    updateDraft({ [field]: value });
    clearError(field);
  };
  const setFromEvent = (field) => (e) => set(field)(e.target.value);

  // ---- 사진
  const addPhotos = (files) => {
    const added = files.map((file) => ({ id: `p${(photoSeq += 1)}`, file, url: getImagePreview(file) }));
    updateDraft((prev) => ({
      photos: [...prev.photos, ...added],
      representativePhotoId: prev.representativePhotoId ?? added[0]?.id ?? null,
    }));
    clearError('images');
  };
  const removePhoto = (id) => {
    updateDraft((prev) => {
      const target = prev.photos.find((p) => p.id === id);
      if (target) revokeImagePreview(target.url);
      const photos = prev.photos.filter((p) => p.id !== id);
      const representativePhotoId =
        prev.representativePhotoId === id ? (photos[0]?.id ?? null) : prev.representativePhotoId;
      return { photos, representativePhotoId };
    });
  };

  // ---- 제출(검증 → 미리보기)
  const handleReview = () => {
    // 목록을 못 불러와 직접 입력 칸만 보이는 경우 '목록에 없음'을 고른 것으로 본다
    const patch = {};
    if (noBuildings && draft.foundBuildingId !== CUSTOM) patch.foundBuildingId = CUSTOM;
    if (noStorages && draft.custodyType === CustodyType.HANDED_OVER && draft.storageId !== CUSTOM) patch.storageId = CUSTOM;
    const draftForCheck = { ...draft, ...patch };
    if (Object.keys(patch).length > 0) updateDraft(patch);

    const found = validateFoundReport(draftForCheck);
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length > 0) {
      // 요약을 먼저 읽어 주고, 첫 오류 항목으로 이동
      requestAnimationFrame(() => focusField(keys[0]));
      return;
    }
    navigate('/report-found/preview');
  };

  const handleCancel = () => {
    if (hasDraftContent(draft)) {
      setConfirmCancel(true);
    } else {
      navigate('/');
    }
  };

  const errorKeys = Object.keys(errors).filter((k) => errors[k]);
  const today = getTodayDate();
  const timeMax = draft.foundDate === today ? getCurrentTime() : undefined;

  const categoryOptions = categories.map((c) => ({ value: c.categoryId, label: c.categoryName }));
  const buildingOptions = [
    ...buildings.map((b) => ({ value: String(b.buildingId), label: b.buildingName })),
    { value: CUSTOM, label: '목록에 없음 (직접 입력)' },
  ];
  const storageOptions = [
    ...storageLocations.map((s) => ({
      value: String(s.storageId),
      label: s.buildingName ? `${s.storageName} (${s.buildingName})` : s.storageName,
    })),
    { value: CUSTOM, label: '목록에 없음 (직접 입력)' },
  ];
  const selectedStorage = storageLocations.find((s) => String(s.storageId) === String(draft.storageId));
  const buildingValue = noBuildings ? CUSTOM : draft.foundBuildingId;
  const storageValue = noStorages ? CUSTOM : draft.storageId;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-36 lg:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text">습득물 신고</h1>
        <p className="mt-1 text-sm text-sub">
          주운 물건의 정보를 입력해 주세요. <span className="text-error">*</span> 표시는 꼭 입력해야 하는 항목이에요.
        </p>
      </div>

      {refError && (
        <Card className="flex gap-2 border-l-4 border-amber-500 bg-amber-50 text-sm text-amber-900">
          <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p>{refError}</p>
        </Card>
      )}

      {errorKeys.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border-l-4 border-error bg-red-50 p-4 focus:outline-none focus:ring-2 focus:ring-error"
        >
          <p className="font-medium text-error">{errorKeys.length}개 항목을 확인해 주세요.</p>
          <ul className="mt-2 space-y-1 text-sm text-error">
            {errorKeys.map((key) => (
              <li key={key}>
                <button type="button" onClick={() => focusField(key)} className="text-left underline hover:no-underline">
                  {FIELD_LABELS[key] || key}: {errors[key]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. 물품 정보 */}
      <FormSection step={1} title="물품 정보">
        <ChoiceGroup
          name="categoryId"
          legend="물품 종류"
          options={categoryOptions}
          value={draft.categoryId}
          onChange={set('categoryId')}
          required
          error={errors.categoryId}
        />
        <Input
          label="물품명"
          name="title"
          placeholder="예: 검은색 우산"
          value={draft.title}
          onChange={setFromEvent('title')}
          required
          maxLength={100}
          error={errors.title}
        />
        <Input
          label="물품 특징 (선택)"
          name="description"
          multiline
          rows={2}
          placeholder="예: 검은색 장우산, 나무 손잡이, 끈에 흰색 단추"
          value={draft.description}
          onChange={setFromEvent('description')}
          maxLength={1000}
          helperText="색상, 브랜드, 크기처럼 겉으로 보이는 특징을 적어 주세요. 모두에게 공개됩니다."
          error={errors.description}
        />

        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setShowPrivate((v) => !v)}
            aria-expanded={showPrivate}
            aria-controls="private-features-panel"
            className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {showPrivate ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            소유자 확인용 비공개 특징 (선택)
          </button>
          {showPrivate && (
            <div id="private-features-panel" className="mt-2 space-y-2 rounded bg-blue-50 p-3">
              <p className="flex items-center gap-1 text-sm text-primary">
                <Lock size={14} aria-hidden="true" /> 공개되지 않고, 관리자가 반환 신청자의 설명과 비교할 때만 사용합니다.
              </p>
              <Input
                label="비공개 특징"
                name="privateFeatures"
                multiline
                rows={2}
                placeholder="예: 손잡이 안쪽에 작은 흠집, 가방 안에 영어 교재"
                value={draft.privateFeatures}
                onChange={setFromEvent('privateFeatures')}
                maxLength={1000}
                error={errors.privateFeatures}
              />
            </div>
          )}
        </div>
      </FormSection>

      {/* 2. 발견 정보 */}
      <FormSection step={2} title="언제, 어디서 발견했나요?">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="발견 날짜"
            name="foundDate"
            type="date"
            value={draft.foundDate}
            max={today}
            onChange={setFromEvent('foundDate')}
            required
            error={errors.foundDate}
          />
          <Input
            label="발견 시간 (선택)"
            name="foundTime"
            type="time"
            value={draft.foundTime}
            max={timeMax}
            onChange={setFromEvent('foundTime')}
            error={errors.foundTime}
          />
        </div>

        {noBuildings ? (
          <Input
            label="발견한 장소"
            name="foundLocation"
            placeholder="예: 학생회관"
            value={draft.foundLocation}
            onChange={(e) => {
              updateDraft({ foundBuildingId: CUSTOM });
              set('foundLocation')(e.target.value);
            }}
            required
            error={errors.foundLocation || errors.foundBuildingId}
          />
        ) : (
          <>
            <Select
              label="발견한 건물"
              name="foundBuildingId"
              options={buildingOptions}
              placeholder={loading ? '건물 목록을 불러오는 중…' : '건물을 선택하세요'}
              value={buildingValue}
              onChange={setFromEvent('foundBuildingId')}
              disabled={loading}
              required
              error={errors.foundBuildingId}
            />
            {buildingValue === CUSTOM && (
              <Input
                label="발견한 장소 이름"
                name="foundLocation"
                placeholder="예: 정문 버스정류장"
                value={draft.foundLocation}
                onChange={setFromEvent('foundLocation')}
                maxLength={255}
                required
                error={errors.foundLocation}
              />
            )}
          </>
        )}

        <Input
          label="상세 위치 (선택)"
          name="foundLocationDetail"
          placeholder="예: 1층 정문 우산꽂이, 302호 강의실 뒷줄"
          value={draft.foundLocationDetail}
          onChange={setFromEvent('foundLocationDetail')}
          maxLength={255}
          helperText="층수, 강의실 번호, 출입구처럼 건물 안의 위치를 적어 주세요."
          error={errors.foundLocationDetail}
        />

        <PickedLocation
          lat={draft.foundLatitude}
          lng={draft.foundLongitude}
          buildings={buildings}
          onChange={() => setPickerTarget('found')}
          onClear={() => updateDraft({ foundLatitude: null, foundLongitude: null })}
          emptyLabel="지도에서 위치 선택 (선택)"
          emptyHelp="건물만 골라도 신고할 수 있어요. 넓은 건물이나 야외라면 지도에서 정확한 지점을 찍어 주세요."
        />
      </FormSection>

      {/* 3. 사진 */}
      <FormSection step={3} title="사진 (선택)" description="최대 3장까지 올릴 수 있어요. 사진이 없어도 신고할 수 있어요.">
        <div id="images" tabIndex={-1} className="focus:outline-none">
          <FileUploadPreview
            photos={draft.photos}
            representativeId={draft.representativePhotoId}
            onAdd={addPhotos}
            onRemove={removePhoto}
            onSetRepresentative={(id) => updateDraft({ representativePhotoId: id })}
            error={errors.images}
          />
        </div>
      </FormSection>

      {/* 4. 보관 정보 */}
      <FormSection step={4} title="지금 물건은 어디에 있나요?">
        <ChoiceGroup
          name="custodyType"
          legend="보관 상태"
          options={CUSTODY_TYPE_OPTIONS}
          value={draft.custodyType}
          onChange={set('custodyType')}
          required
          error={errors.custodyType}
          columns="grid-cols-1"
        />

        {draft.custodyType === CustodyType.HANDED_OVER && (
          <div className="space-y-4 rounded border border-blue-200 bg-blue-50/50 p-3">
            {noStorages ? (
              <Input
                label="맡긴 보관 장소"
                name="storageLocation"
                placeholder="예: 행정관 1층 학생지원팀"
                value={draft.storageLocation}
                onChange={(e) => {
                  updateDraft({ storageId: CUSTOM });
                  set('storageLocation')(e.target.value);
                }}
                required
                error={errors.storageLocation || errors.storageId}
              />
            ) : (
              <>
                <Select
                  label="맡긴 보관 장소"
                  name="storageId"
                  options={storageOptions}
                  placeholder={loading ? '보관 장소를 불러오는 중…' : '보관 장소를 선택하세요'}
                  value={storageValue}
                  onChange={setFromEvent('storageId')}
                  disabled={loading}
                  required
                  error={errors.storageId}
                />
                {selectedStorage && (
                  <p className="text-sm text-sub">
                    {selectedStorage.detailLocation}
                    {selectedStorage.operatingHours && ` · ${selectedStorage.operatingHours}`}
                  </p>
                )}
                {storageValue === CUSTOM && (
                  <>
                    <Input
                      label="보관 장소 이름"
                      name="storageLocation"
                      placeholder="예: 공학관 학과 사무실"
                      value={draft.storageLocation}
                      onChange={setFromEvent('storageLocation')}
                      maxLength={255}
                      required
                      error={errors.storageLocation}
                    />
                    <PickedLocation
                      lat={draft.storageLatitude}
                      lng={draft.storageLongitude}
                      buildings={buildings}
                      onChange={() => setPickerTarget('storage')}
                      onClear={() => updateDraft({ storageLatitude: null, storageLongitude: null })}
                      emptyLabel="지도에서 보관 위치 선택 (선택)"
                    />
                  </>
                )}
              </>
            )}
            <Input
              label="보관 장소 설명 (선택)"
              name="storageLocationDetail"
              placeholder="예: 사무실 입구 왼쪽 분실물 선반"
              value={draft.storageLocationDetail}
              onChange={setFromEvent('storageLocationDetail')}
              maxLength={255}
              error={errors.storageLocationDetail}
            />
          </div>
        )}

        {draft.custodyType === CustodyType.TEMPORARY && (
          <p className="flex gap-2 rounded bg-gray-50 p-3 text-sm text-sub">
            <Lock size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            회원님의 연락처나 거주지는 공개되지 않아요. 다른 사용자에게는 "습득자가 임시 보관 중"으로만 보이고,
            반환 신청이 들어오면 관리 부서가 연결해 드려요.
          </p>
        )}
        {draft.custodyType === CustodyType.PENDING_HANDOVER && (
          <p className="text-sm text-sub">관리 부서에 맡긴 뒤에는 마이페이지에서 보관 장소를 바꿀 수 있어요.</p>
        )}
      </FormSection>

      {/* 하단 버튼: 모바일에서는 하단 내비게이션 위에 고정 */}
      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-gray-200 bg-white p-3 shadow-lg lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 lg:flex-none lg:px-8">
            취소
          </Button>
          <Button type="button" variant="primary" onClick={handleReview} className="flex-[2]">
            신고 내용 확인
          </Button>
        </div>
      </div>

      <MapLocationPicker
        open={pickerTarget !== null}
        title={pickerTarget === 'storage' ? '물건을 맡긴 곳 선택' : '물건을 발견한 곳 선택'}
        description={pickerTarget === 'storage' ? '보관 위치는 발견 위치와 따로 저장돼요.' : '발견 위치는 보관 위치와 따로 저장돼요.'}
        buildings={buildings}
        initial={
          pickerTarget === 'storage'
            ? { lat: draft.storageLatitude, lng: draft.storageLongitude }
            : { lat: draft.foundLatitude, lng: draft.foundLongitude }
        }
        onCancel={() => setPickerTarget(null)}
        onConfirm={({ lat, lng, buildingId }) => {
          if (pickerTarget === 'storage') {
            if (lat != null) updateDraft({ storageLatitude: lat, storageLongitude: lng });
          } else {
            const patch = {};
            if (lat != null) Object.assign(patch, { foundLatitude: lat, foundLongitude: lng });
            // 건물을 아직 안 골랐으면 지도에서 고른(또는 가장 가까운) 건물로 채운다
            if (buildingId && (!draft.foundBuildingId || (draft.foundBuildingId === CUSTOM && !draft.foundLocation.trim()))) {
              patch.foundBuildingId = String(buildingId);
              clearError('foundBuildingId');
            }
            updateDraft(patch);
          }
          setPickerTarget(null);
        }}
      />

      <Modal
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="신고를 취소할까요?"
      >
        <p className="text-text">입력한 내용과 사진이 모두 지워집니다.</p>
        <div className="mt-4 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmCancel(false)}>
            계속 작성
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 bg-error hover:bg-red-700"
            onClick={() => {
              resetDraft();
              navigate('/');
            }}
          >
            취소하고 나가기
          </Button>
        </div>
      </Modal>
    </div>
  );
}
