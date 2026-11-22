import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import FileUploadPreview from '../common/FileUploadPreview.jsx';
import ChoiceGroup from '../found-item/ChoiceGroup.jsx';
import FormSection from '../found-item/FormSection.jsx';
import MapLocationPicker from '../map/MapLocationPicker.jsx';
import PickedLocation from '../map/PickedLocation.jsx';
import { getTodayDate } from '../../utils/dateUtils.js';
import { getImagePreview, revokeImagePreview } from '../../utils/imageValidator.js';
import { CUSTOM, DateMode, FIELD_LABELS, validateLostReport } from '../../utils/lostReportForm.js';

let photoSeq = 0;

function focusField(key) {
  const el = document.getElementById(key) || document.querySelector(`[data-field="${key}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

const DATE_MODE_OPTIONS = [
  { value: DateMode.SINGLE, label: '날짜를 알아요' },
  { value: DateMode.RANGE, label: '기간으로 입력', description: '정확한 날을 모르면 마지막으로 본 날 ~ 잃어버린 걸 안 날' },
];

/**
 * 분실 신고 작성·수정 폼 (SPEC §11)
 * - 날짜를 모르면 기간으로 입력
 * - 대표 추정 위치 하나 + 추가 설명. 여러 장소를 강제로 입력하게 하지 않는다
 * - 지도 위치 선택은 습득물 신고와 같은 MapLocationPicker
 *
 * @param initialDraft emptyLostDraft() 형태
 * @param onSubmit (draft) => Promise<void>  검증을 통과한 경우에만 호출
 * @param serverErrors 서버가 돌려준 항목별 오류
 */
export default function LostReportForm({
  initialDraft,
  categories,
  buildings,
  referenceLoading,
  referenceError,
  serverErrors,
  serverMessage,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  notice,
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const summaryRef = useRef(null);
  const photosRef = useRef(draft.photos);
  useEffect(() => {
    photosRef.current = draft.photos;
  }, [draft.photos]);

  // 화면을 떠나면 새로 고른 사진의 미리보기 URL을 정리한다
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => {
        if (p.file) revokeImagePreview(p.url);
      });
    },
    [],
  );

  // 서버 검증 오류가 오면 표시하고 요약으로 이동
  useEffect(() => {
    if (serverErrors && Object.keys(serverErrors).length > 0) {
      setErrors(serverErrors);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }, [serverErrors]);

  const noBuildings = !referenceLoading && buildings.length === 0;

  const update = (patch) => setDraft((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  const clearError = (...fields) => {
    if (fields.some((f) => errors[f])) {
      setErrors((prev) => {
        const next = { ...prev };
        fields.forEach((f) => delete next[f]);
        return next;
      });
    }
  };
  const set = (field) => (value) => {
    update({ [field]: value });
    clearError(field);
  };
  const setFromEvent = (field) => (e) => set(field)(e.target.value);

  const addPhotos = (files) => {
    const added = files.map((file) => ({ id: `lp${(photoSeq += 1)}`, file, url: getImagePreview(file) }));
    update((prev) => ({
      photos: [...prev.photos, ...added],
      representativePhotoId: prev.representativePhotoId ?? added[0]?.id ?? null,
    }));
    clearError('images');
  };
  const removePhoto = (id) => {
    update((prev) => {
      const target = prev.photos.find((p) => p.id === id);
      if (target?.file) revokeImagePreview(target.url);
      const photos = prev.photos.filter((p) => p.id !== id);
      return {
        photos,
        representativePhotoId: prev.representativePhotoId === id ? (photos[0]?.id ?? null) : prev.representativePhotoId,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const patch = noBuildings && draft.lostBuildingId !== CUSTOM ? { lostBuildingId: CUSTOM } : {};
    const checked = { ...draft, ...patch };
    if (patch.lostBuildingId) update(patch);
    const found = validateLostReport(checked);
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length > 0) {
      requestAnimationFrame(() => focusField(keys[0]));
      return;
    }
    await onSubmit(checked);
  };

  const errorKeys = Object.keys(errors).filter((k) => errors[k]);
  const today = getTodayDate();
  const range = draft.dateMode === DateMode.RANGE;
  const categoryOptions = categories.map((c) => ({ value: c.categoryId, label: c.categoryName }));
  const buildingOptions = [
    ...buildings.map((b) => ({ value: String(b.buildingId), label: b.buildingName })),
    { value: CUSTOM, label: '목록에 없음 (직접 입력)' },
  ];
  const buildingValue = noBuildings ? CUSTOM : draft.lostBuildingId;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5 pb-36 lg:pb-8">
      {notice}

      {referenceError && (
        <Card className="flex gap-2 border-l-4 border-amber-500 bg-amber-50 text-sm text-amber-900">
          <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p>{referenceError}</p>
        </Card>
      )}

      {(errorKeys.length > 0 || serverMessage) && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border-l-4 border-error bg-red-50 p-4 focus:outline-none focus:ring-2 focus:ring-error"
        >
          <p className="font-medium text-error">
            {errorKeys.length > 0 ? `${errorKeys.length}개 항목을 확인해 주세요.` : serverMessage}
          </p>
          {errorKeys.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-error">
              {errorKeys.map((key) => (
                <li key={key}>
                  <button type="button" onClick={() => focusField(key)} className="text-left underline hover:no-underline">
                    {FIELD_LABELS[key] || key}: {errors[key]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 1. 물품 정보 */}
      <FormSection step={1} title="어떤 물건을 잃어버렸나요?">
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
          placeholder="예: 파란색 파우치"
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
          rows={3}
          placeholder="예: 손바닥 크기 파란색 천 파우치, 지퍼에 노란 고리"
          value={draft.description}
          onChange={setFromEvent('description')}
          maxLength={1000}
          helperText="색상, 브랜드, 크기처럼 겉으로 보이는 특징을 적어 주세요. 모두에게 공개되니 학번·연락처는 적지 마세요."
          error={errors.description}
        />
      </FormSection>

      {/* 2. 날짜 */}
      <FormSection step={2} title="언제 잃어버렸나요?">
        <ChoiceGroup
          name="dateMode"
          legend="날짜 입력 방식"
          options={DATE_MODE_OPTIONS}
          value={draft.dateMode}
          onChange={(v) => {
            update({ dateMode: v, ...(v === DateMode.SINGLE ? { lostEndDate: '' } : {}) });
            clearError('lostDate', 'lostEndDate');
          }}
          columns="grid-cols-1 sm:grid-cols-2"
        />
        <div className={`grid gap-4 ${range ? 'sm:grid-cols-2' : ''}`}>
          <Input
            label={range ? '기간 시작 (마지막으로 본 날)' : '잃어버린 날짜'}
            name="lostDate"
            type="date"
            value={draft.lostDate}
            max={today}
            onChange={setFromEvent('lostDate')}
            required
            error={errors.lostDate}
          />
          {range && (
            <Input
              label="기간 끝 (잃어버린 걸 안 날)"
              name="lostEndDate"
              type="date"
              value={draft.lostEndDate}
              min={draft.lostDate || undefined}
              max={today}
              onChange={setFromEvent('lostEndDate')}
              required
              error={errors.lostEndDate}
            />
          )}
        </div>
      </FormSection>

      {/* 3. 위치 */}
      <FormSection
        step={3}
        title="어디서 잃어버린 것 같나요?"
        description="가장 가능성이 높은 곳 하나만 고르고, 헷갈리는 다른 장소는 추가 설명에 적어 주세요."
      >
        {noBuildings ? (
          <Input
            label="대표 추정 위치"
            name="lostLocation"
            placeholder="예: 도서관"
            value={draft.lostLocation}
            onChange={(e) => {
              update({ lostBuildingId: CUSTOM });
              set('lostLocation')(e.target.value);
            }}
            required
            maxLength={255}
            error={errors.lostLocation || errors.lostBuildingId}
          />
        ) : (
          <>
            <Select
              label="대표 추정 위치"
              name="lostBuildingId"
              options={buildingOptions}
              placeholder={referenceLoading ? '건물 목록을 불러오는 중…' : '건물을 선택하세요'}
              value={buildingValue}
              onChange={(e) => {
                set('lostBuildingId')(e.target.value);
                clearError('lostLocation');
              }}
              disabled={referenceLoading}
              required
              error={errors.lostBuildingId}
            />
            {buildingValue === CUSTOM && (
              <Input
                label="장소 이름"
                name="lostLocation"
                placeholder="예: 정문 버스정류장"
                value={draft.lostLocation}
                onChange={setFromEvent('lostLocation')}
                maxLength={255}
                required
                error={errors.lostLocation}
              />
            )}
          </>
        )}

        <Input
          label="추가 설명 (선택)"
          name="lostLocationDetail"
          placeholder="예: 3층 열람실이나 1층 로비 중 한 곳, 오후 2~4시 사이"
          value={draft.lostLocationDetail}
          onChange={setFromEvent('lostLocationDetail')}
          maxLength={255}
          helperText="층수, 강의실, 들렀던 다른 장소처럼 확실하지 않은 내용도 적어 두면 찾는 데 도움이 돼요."
          error={errors.lostLocationDetail}
        />

        <PickedLocation
          lat={draft.lostLatitude}
          lng={draft.lostLongitude}
          buildings={buildings}
          onChange={() => setPickerOpen(true)}
          onClear={() => update({ lostLatitude: null, lostLongitude: null })}
          emptyLabel="지도에서 위치 선택 (선택)"
          emptyHelp="건물만 골라도 신고할 수 있어요. 지도에는 건물 위치로 표시돼요."
        />
      </FormSection>

      {/* 4. 사진 */}
      <FormSection step={4} title="사진 (선택)" description="같은 제품 사진이나 예전에 찍은 사진이 있으면 올려 주세요. 최대 3장.">
        <div id="images" tabIndex={-1} className="focus:outline-none">
          <FileUploadPreview
            photos={draft.photos}
            representativeId={draft.representativePhotoId}
            onAdd={addPhotos}
            onRemove={removePhoto}
            onSetRepresentative={(id) => update({ representativePhotoId: id })}
            error={errors.images}
          />
        </div>
      </FormSection>

      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-gray-200 bg-white p-3 shadow-lg lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting} className="flex-1 lg:flex-none lg:px-8">
            취소
          </Button>
          <Button type="submit" disabled={submitting} className="flex-[2]">
            {submitting ? '저장하는 중…' : submitLabel}
          </Button>
        </div>
      </div>

      <MapLocationPicker
        open={pickerOpen}
        title="잃어버린 것 같은 곳 선택"
        description="정확하지 않아도 괜찮아요. 가장 가능성이 높은 곳을 찍어 주세요."
        buildings={buildings}
        initial={{ lat: draft.lostLatitude, lng: draft.lostLongitude }}
        onCancel={() => setPickerOpen(false)}
        onConfirm={({ lat, lng, buildingId }) => {
          const patch = {};
          if (lat != null) Object.assign(patch, { lostLatitude: lat, lostLongitude: lng });
          if (buildingId && (!draft.lostBuildingId || (draft.lostBuildingId === CUSTOM && !draft.lostLocation.trim()))) {
            patch.lostBuildingId = String(buildingId);
            clearError('lostBuildingId', 'lostLocation');
          }
          update(patch);
          setPickerOpen(false);
        }}
      />
    </form>
  );
}
