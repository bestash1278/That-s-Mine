import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Info, Lock } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import FileUploadPreview from '../components/common/FileUploadPreview.jsx';
import Input from '../components/common/Input.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import Select from '../components/common/Select.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ChoiceGroup from '../components/found-item/ChoiceGroup.jsx';
import FormSection from '../components/found-item/FormSection.jsx';
import MapLocationPicker from '../components/map/MapLocationPicker.jsx';
import PickedLocation from '../components/map/PickedLocation.jsx';
import { updateFoundItem } from '../api/foundItems.js';
import { getMyFoundItem } from '../api/me.js';
import { toUserError } from '../api/client.js';
import { CUSTODY_TYPE_OPTIONS, CustodyType } from '../constants/custodyTypes.js';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { getCurrentTime, getTodayDate } from '../utils/dateUtils.js';
import { photosFromUrls, splitPhotos } from '../utils/editPhotos.js';
import { getImagePreview, revokeImagePreview } from '../utils/imageValidator.js';
import {
  CUSTOM,
  FIELD_LABELS,
  buildFoundItemRequest,
  draftFromFoundItem,
  validateFoundReport,
} from '../utils/reportFoundForm.js';

let photoSeq = 0;

function focusField(key) {
  const el = document.getElementById(key) || document.querySelector(`[data-field="${key}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

/**
 * 내가 신고한 습득물 수정 (SPEC §14)
 * 반환 진행 중·완료, 처리 중인 반환 신청이 있으면 수정할 수 없다(서버가 최종 판단).
 * 처리 상태(보관 중 등)는 관리자가 바꾼다.
 */
export default function EditFoundItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading: refLoading, error: refError, categories, buildings, storageLocations } = useReferenceData();

  const [item, setItem] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const summaryRef = useRef(null);
  const photosRef = useRef([]);

  const load = useCallback(async () => {
    setLoadError(null);
    setItem(null);
    try {
      const data = await getMyFoundItem(id);
      const photos = photosFromUrls(data.imageUrls);
      setItem(data);
      setDraft({ ...draftFromFoundItem(data), photos, representativePhotoId: photos[0]?.id ?? null });
    } catch (err) {
      setLoadError(toUserError(err, '습득물 정보를 불러오지 못했습니다.'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    photosRef.current = draft?.photos || [];
  }, [draft]);
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => {
        if (p.file) revokeImagePreview(p.url);
      });
    },
    [],
  );

  if (loadError) {
    return loadError.status === 404 || loadError.status === 403 ? (
      <ErrorState message={loadError.message} />
    ) : (
      <ErrorState message={loadError.message} onRetry={load} />
    );
  }
  if (!item || !draft) return <LoadingState />;

  if (!item.editable) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-text">습득물 정보 수정</h1>
        <Card className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-medium text-text">{item.title}</p>
            <StatusBadge status={item.status} label={item.statusLabel} />
          </div>
          <p className="flex gap-2 text-text">
            <Lock size={18} className="mt-0.5 flex-shrink-0 text-sub" aria-hidden="true" /> {item.lockReason}
          </p>
        </Card>
        <Link to="/mypage?tab=found" className="inline-flex min-h-[44px] items-center font-medium text-primary underline">
          마이페이지로 돌아가기
        </Link>
      </div>
    );
  }

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
    const added = files.map((file) => ({ id: `ep${(photoSeq += 1)}`, file, url: getImagePreview(file) }));
    update((prev) => ({
      photos: [...prev.photos, ...added],
      representativePhotoId: prev.representativePhotoId ?? added[0]?.id ?? null,
    }));
    clearError('images');
  };
  const removePhoto = (photoId) => {
    update((prev) => {
      const target = prev.photos.find((p) => p.id === photoId);
      if (target?.file) revokeImagePreview(target.url);
      const photos = prev.photos.filter((p) => p.id !== photoId);
      return {
        photos,
        representativePhotoId: prev.representativePhotoId === photoId ? (photos[0]?.id ?? null) : prev.representativePhotoId,
      };
    });
  };

  const noBuildings = !refLoading && buildings.length === 0;
  const noStorages = !refLoading && storageLocations.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const patch = {};
    if (noBuildings && draft.foundBuildingId !== CUSTOM) patch.foundBuildingId = CUSTOM;
    if (noStorages && draft.custodyType === CustodyType.HANDED_OVER && draft.storageId !== CUSTOM) patch.storageId = CUSTOM;
    const checked = { ...draft, ...patch };
    if (Object.keys(patch).length) update(patch);

    const found = validateFoundReport(checked);
    setErrors(found);
    setServerMessage('');
    const keys = Object.keys(found);
    if (keys.length > 0) {
      requestAnimationFrame(() => focusField(keys[0]));
      return;
    }

    setSubmitting(true);
    const photos = splitPhotos(checked.photos, checked.representativePhotoId);
    const base = buildFoundItemRequest(checked);
    delete base.representativeImageIndex;
    try {
      await updateFoundItem(
        id,
        {
          ...base,
          keepImageUrls: photos.keepImageUrls,
          representativeImageUrl: photos.representativeImageUrl,
          representativeImageIndex: photos.representativeImageIndex,
        },
        photos.files,
      );
      navigate('/mypage?tab=found', { replace: true, state: { notice: '습득물 정보를 수정했습니다.' } });
    } catch (err) {
      const ue = toUserError(err, '수정하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrors(ue.fieldErrors);
      setServerMessage(Object.keys(ue.fieldErrors).length ? '' : ue.message);
      setSubmitting(false);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  };

  const errorKeys = Object.keys(errors).filter((k) => errors[k]);
  const today = getTodayDate();
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
  const buildingValue = noBuildings ? CUSTOM : draft.foundBuildingId;
  const storageValue = noStorages ? CUSTOM : draft.storageId;

  return (
    <form noValidate onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 pb-36 lg:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-text">습득물 정보 수정</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-sub">
          등록 번호 {item.itemNo} <StatusBadge status={item.status} label={item.statusLabel} />
        </p>
      </div>

      {refError && (
        <Card className="flex gap-2 border-l-4 border-amber-500 bg-amber-50 text-sm text-amber-900">
          <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p>{refError}</p>
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
        <Input label="물품명" name="title" value={draft.title} onChange={setFromEvent('title')} required maxLength={100} error={errors.title} />
        <Input
          label="물품 특징 (선택)"
          name="description"
          multiline
          rows={2}
          value={draft.description}
          onChange={setFromEvent('description')}
          maxLength={1000}
          helperText="모두에게 공개됩니다."
          error={errors.description}
        />
        <div className="space-y-2 rounded bg-blue-50 p-3">
          <p className="flex items-center gap-1 text-sm text-primary">
            <Lock size={14} aria-hidden="true" /> 공개되지 않고, 관리자가 반환 신청자의 설명과 비교할 때만 사용합니다.
          </p>
          <Input
            label="소유자 확인용 비공개 특징 (선택)"
            name="privateFeatures"
            multiline
            rows={2}
            value={draft.privateFeatures}
            onChange={setFromEvent('privateFeatures')}
            maxLength={1000}
            error={errors.privateFeatures}
          />
        </div>
      </FormSection>

      <FormSection step={2} title="발견 정보">
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
            max={draft.foundDate === today ? getCurrentTime() : undefined}
            onChange={setFromEvent('foundTime')}
            error={errors.foundTime}
          />
        </div>
        {noBuildings ? (
          <Input
            label="발견한 장소"
            name="foundLocation"
            value={draft.foundLocation}
            onChange={(e) => {
              update({ foundBuildingId: CUSTOM });
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
              placeholder={refLoading ? '건물 목록을 불러오는 중…' : '건물을 선택하세요'}
              value={buildingValue}
              onChange={setFromEvent('foundBuildingId')}
              disabled={refLoading}
              required
              error={errors.foundBuildingId}
            />
            {buildingValue === CUSTOM && (
              <Input
                label="발견한 장소 이름"
                name="foundLocation"
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
          value={draft.foundLocationDetail}
          onChange={setFromEvent('foundLocationDetail')}
          maxLength={255}
          error={errors.foundLocationDetail}
        />
        <PickedLocation
          lat={draft.foundLatitude}
          lng={draft.foundLongitude}
          buildings={buildings}
          onChange={() => setPickerTarget('found')}
          onClear={() => update({ foundLatitude: null, foundLongitude: null })}
          emptyLabel="지도에서 위치 선택 (선택)"
        />
      </FormSection>

      <FormSection step={3} title="사진 (선택)" description="지운 사진은 저장하면 목록에서 사라져요. 최대 3장.">
        <div id="images" tabIndex={-1} className="focus:outline-none">
          <FileUploadPreview
            photos={draft.photos}
            representativeId={draft.representativePhotoId}
            onAdd={addPhotos}
            onRemove={removePhoto}
            onSetRepresentative={(photoId) => update({ representativePhotoId: photoId })}
            error={errors.images}
          />
        </div>
      </FormSection>

      <FormSection step={4} title="지금 물건은 어디에 있나요?" description="관리 부서에 맡겼다면 맡긴 곳으로 바꿔 주세요.">
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
                value={draft.storageLocation}
                onChange={(e) => {
                  update({ storageId: CUSTOM });
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
                  placeholder={refLoading ? '보관 장소를 불러오는 중…' : '보관 장소를 선택하세요'}
                  value={storageValue}
                  onChange={setFromEvent('storageId')}
                  disabled={refLoading}
                  required
                  error={errors.storageId}
                />
                {storageValue === CUSTOM && (
                  <>
                    <Input
                      label="보관 장소 이름"
                      name="storageLocation"
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
                      onClear={() => update({ storageLatitude: null, storageLongitude: null })}
                      emptyLabel="지도에서 보관 위치 선택 (선택)"
                    />
                  </>
                )}
              </>
            )}
            <Input
              label="보관 장소 설명 (선택)"
              name="storageLocationDetail"
              value={draft.storageLocationDetail}
              onChange={setFromEvent('storageLocationDetail')}
              maxLength={255}
              error={errors.storageLocationDetail}
            />
          </div>
        )}
      </FormSection>

      <div className="fixed inset-x-0 bottom-[72px] z-30 border-t border-gray-200 bg-white p-3 shadow-lg lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={submitting} className="flex-1 lg:flex-none lg:px-8">
            취소
          </Button>
          <Button type="submit" disabled={submitting} className="flex-[2]">
            {submitting ? '저장하는 중…' : '수정 내용 저장'}
          </Button>
        </div>
      </div>

      <MapLocationPicker
        open={pickerTarget !== null}
        title={pickerTarget === 'storage' ? '물건을 맡긴 곳 선택' : '물건을 발견한 곳 선택'}
        buildings={buildings}
        initial={
          pickerTarget === 'storage'
            ? { lat: draft.storageLatitude, lng: draft.storageLongitude }
            : { lat: draft.foundLatitude, lng: draft.foundLongitude }
        }
        onCancel={() => setPickerTarget(null)}
        onConfirm={({ lat, lng, buildingId }) => {
          if (pickerTarget === 'storage') {
            if (lat != null) update({ storageLatitude: lat, storageLongitude: lng });
          } else {
            const patch = {};
            if (lat != null) Object.assign(patch, { foundLatitude: lat, foundLongitude: lng });
            if (buildingId && (!draft.foundBuildingId || (draft.foundBuildingId === CUSTOM && !draft.foundLocation.trim()))) {
              patch.foundBuildingId = String(buildingId);
              clearError('foundBuildingId');
            }
            update(patch);
          }
          setPickerTarget(null);
        }}
      />
    </form>
  );
}
