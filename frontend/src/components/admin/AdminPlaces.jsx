import { useCallback, useEffect, useState } from 'react';
import { Archive, Building2, Plus } from 'lucide-react';
import Button from '../common/Button.jsx';
import ErrorState from '../common/ErrorState.jsx';
import Input from '../common/Input.jsx';
import LoadingState from '../common/LoadingState.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import MapLocationPicker from '../map/MapLocationPicker.jsx';
import PickedLocation from '../map/PickedLocation.jsx';
import {
  createBuilding,
  createStorageLocation,
  getAdminStorageLocations,
  updateBuilding,
  updateStorageLocation,
} from '../../api/admin.js';
import { toUserError } from '../../api/client.js';
import { getCampusBuildings } from '../../api/reference.js';

const toText = (value) => (value == null ? '' : String(value));
const toNumber = (value) => {
  const text = String(value ?? '').trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
};

/** 교내 건물과 공식 보관 장소 관리. 좌표는 "시연용" 설정값이므로 실제 위치로 확정하지 않는다. */
export default function AdminPlaces({ onNotice }) {
  const [state, setState] = useState({ loading: true, error: null, buildings: [], storages: [] });
  const [dialog, setDialog] = useState(null); // { type: 'building' | 'storage', value? }

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [buildings, storages] = await Promise.all([getCampusBuildings(), getAdminStorageLocations()]);
      setState({ loading: false, error: null, buildings, storages });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: toUserError(err, '장소 목록을 불러오지 못했습니다.').message }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const done = (message) => {
    setDialog(null);
    onNotice?.(message);
    load();
  };

  if (state.loading && state.buildings.length === 0) return <LoadingState />;
  if (state.error && state.buildings.length === 0) return <ErrorState message={state.error} onRetry={load} />;

  return (
    <div className="space-y-8">
      <section aria-labelledby="admin-buildings" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-buildings" className="flex items-center gap-2 text-lg font-bold text-text">
            <Building2 size={20} aria-hidden="true" /> 교내 건물 ({state.buildings.length})
          </h2>
          <Button type="button" size="sm" onClick={() => setDialog({ type: 'building' })}>
            <Plus size={16} className="mr-1" aria-hidden="true" /> 건물 등록
          </Button>
        </div>
        <ul className="space-y-2">
          {state.buildings.map((b) => (
            <li key={b.buildingId} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text">{b.buildingName}</p>
                <p className="text-sm text-sub">
                  위도 {b.latitude} · 경도 {b.longitude}
                </p>
                {b.description && <p className="text-sm text-text">{b.description}</p>}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ type: 'building', value: b })}>
                수정
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-sub">건물 좌표는 시연용 설정값이에요. 실제 캠퍼스 위치로 확정된 정보가 아니에요.</p>
      </section>

      <section aria-labelledby="admin-storages" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-storages" className="flex items-center gap-2 text-lg font-bold text-text">
            <Archive size={20} aria-hidden="true" /> 공식 보관 장소 ({state.storages.length})
          </h2>
          <Button type="button" size="sm" onClick={() => setDialog({ type: 'storage' })}>
            <Plus size={16} className="mr-1" aria-hidden="true" /> 보관 장소 등록
          </Button>
        </div>
        <ul className="space-y-2">
          {state.storages.map((s) => (
            <li key={s.storageId} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex flex-wrap items-center gap-2 font-medium text-text">
                  {s.storageName}
                  {!s.active && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-800">사용 중지</span>
                  )}
                </p>
                <p className="text-sm text-sub">
                  {s.buildingName}
                  {s.detailLocation ? ` · ${s.detailLocation}` : ''}
                </p>
                <p className="text-sm text-text">
                  {s.operatingHours || '운영 시간 미입력'} · {s.contactPhone || '문의처 미입력'}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ type: 'storage', value: s })}>
                수정
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-sub">사용 중지한 장소는 신고 화면과 보관 위치 지정 목록에서 빠지고, 이미 그곳에 보관된 물품 정보는 그대로 남아요.</p>
      </section>

      {dialog?.type === 'building' && (
        <BuildingDialog value={dialog.value} buildings={state.buildings} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog?.type === 'storage' && (
        <StorageDialog value={dialog.value} buildings={state.buildings} onClose={() => setDialog(null)} onDone={done} />
      )}
    </div>
  );
}

/** 좌표 입력(위도·경도 직접 입력 + 지도에서 선택). 지도를 못 써도 숫자로 입력할 수 있다. */
function CoordinateFields({ lat, lng, onChange, buildings, error, optionalHelp }) {
  const [picker, setPicker] = useState(false);
  const latNum = toNumber(lat);
  const lngNum = toNumber(lng);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Input label="위도" name="latitude" inputMode="decimal" value={lat} onChange={(e) => onChange({ lat: e.target.value, lng })} />
        <Input label="경도" name="longitude" inputMode="decimal" value={lng} onChange={(e) => onChange({ lat, lng: e.target.value })} />
      </div>
      {optionalHelp && <p className="text-sm text-sub">{optionalHelp}</p>}
      {error && <p className="text-sm text-error">{error}</p>}
      <PickedLocation
        lat={Number.isFinite(latNum) ? latNum : null}
        lng={Number.isFinite(lngNum) ? lngNum : null}
        buildings={buildings}
        emptyLabel="지도에서 위치 선택"
        onChange={() => setPicker(true)}
        onClear={() => onChange({ lat: '', lng: '' })}
      />
      <MapLocationPicker
        open={picker}
        title="위치 선택"
        description="지도에서 고른 좌표가 위도·경도 칸에 들어가요."
        buildings={buildings}
        initial={{ lat: Number.isFinite(latNum) ? latNum : null, lng: Number.isFinite(lngNum) ? lngNum : null }}
        onCancel={() => setPicker(false)}
        onConfirm={({ lat: pickedLat, lng: pickedLng }) => {
          if (pickedLat != null) onChange({ lat: String(pickedLat), lng: String(pickedLng) });
          setPicker(false);
        }}
      />
    </div>
  );
}

function BuildingDialog({ value, buildings, onClose, onDone }) {
  const editing = Boolean(value);
  const [form, setForm] = useState({
    buildingName: toText(value?.buildingName),
    lat: toText(value?.latitude),
    lng: toText(value?.longitude),
    description: toText(value?.description),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const lat = toNumber(form.lat);
    const lng = toNumber(form.lng);
    const found = {};
    if (!form.buildingName.trim()) found.buildingName = '건물 이름을 입력해 주세요.';
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) found.coordinates = '위도와 경도를 숫자로 입력해 주세요.';
    else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) found.coordinates = '위도는 -90~90, 경도는 -180~180 사이여야 해요.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError('');
    try {
      const body = { buildingName: form.buildingName.trim(), latitude: lat, longitude: lng, description: form.description.trim() || undefined };
      if (editing) await updateBuilding(value.buildingId, body);
      else await createBuilding(body);
      onDone(`건물 '${body.buildingName}'을(를) ${editing ? '수정' : '등록'}했어요.`);
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '건물을 저장하지 못했습니다.');
      setErrors(fieldErrors);
      setError(Object.keys(fieldErrors).length > 0 ? '입력한 내용을 확인해 주세요.' : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen title={editing ? '건물 수정' : '건물 등록'} onClose={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input
          label="건물 이름"
          name="buildingName"
          required
          value={form.buildingName}
          onChange={(e) => setForm((prev) => ({ ...prev, buildingName: e.target.value }))}
          error={errors.buildingName}
          maxLength={100}
        />
        <CoordinateFields
          lat={form.lat}
          lng={form.lng}
          buildings={buildings}
          error={errors.coordinates}
          onChange={({ lat, lng }) => setForm((prev) => ({ ...prev, lat, lng }))}
        />
        <Input
          label="설명 (선택)"
          name="description"
          multiline
          rows={2}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          error={errors.description}
        />
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="flex-1">
            닫기
          </Button>
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StorageDialog({ value, buildings, onClose, onDone }) {
  const editing = Boolean(value);
  const [form, setForm] = useState({
    buildingId: toText(value?.buildingId),
    storageName: toText(value?.storageName),
    lat: toText(value?.latitude),
    lng: toText(value?.longitude),
    detailLocation: toText(value?.detailLocation),
    contactPhone: toText(value?.contactPhone),
    operatingHours: toText(value?.operatingHours),
    pickupGuide: toText(value?.pickupGuide),
    description: toText(value?.description),
    active: value ? value.active : true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const set = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const lat = toNumber(form.lat);
    const lng = toNumber(form.lng);
    const found = {};
    if (!form.buildingId) found.buildingId = '보관 장소가 있는 건물을 선택해 주세요.';
    if (!form.storageName.trim()) found.storageName = '보관 장소 이름을 입력해 주세요.';
    if (Number.isNaN(lat) || Number.isNaN(lng) || (lat == null) !== (lng == null)) found.coordinates = '위도와 경도를 함께, 숫자로 입력해 주세요.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError('');
    try {
      const body = {
        buildingId: Number(form.buildingId),
        storageName: form.storageName.trim(),
        latitude: lat,
        longitude: lng,
        detailLocation: form.detailLocation.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        operatingHours: form.operatingHours.trim() || undefined,
        pickupGuide: form.pickupGuide.trim() || undefined,
        description: form.description.trim() || undefined,
        active: form.active,
      };
      if (editing) await updateStorageLocation(value.storageId, body);
      else await createStorageLocation(body);
      onDone(`보관 장소 '${body.storageName}'을(를) ${editing ? '수정' : '등록'}했어요.`);
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '보관 장소를 저장하지 못했습니다.');
      setErrors(fieldErrors);
      setError(Object.keys(fieldErrors).length > 0 ? '입력한 내용을 확인해 주세요.' : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen title={editing ? '보관 장소 수정' : '보관 장소 등록'} onClose={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Select
          label="건물"
          name="storageBuildingId"
          required
          placeholder="건물을 선택해 주세요"
          options={buildings.map((b) => ({ id: b.buildingId, name: b.buildingName }))}
          value={form.buildingId}
          onChange={set('buildingId')}
          error={errors.buildingId}
        />
        <Input label="보관 장소 이름" name="storageName" required value={form.storageName} onChange={set('storageName')} error={errors.storageName} maxLength={100} />
        <Input label="상세 위치 (선택)" name="detailLocation" value={form.detailLocation} onChange={set('detailLocation')} error={errors.detailLocation} helperText="예: 1층 민원실" maxLength={255} />
        <Input label="문의 전화 (선택)" name="contactPhone" value={form.contactPhone} onChange={set('contactPhone')} error={errors.contactPhone} maxLength={20} />
        <Input label="운영 시간 (선택)" name="operatingHours" value={form.operatingHours} onChange={set('operatingHours')} error={errors.operatingHours} helperText="예: 평일 09:00~17:00" maxLength={100} />
        <Input label="수령 시 준비물·절차 (선택)" name="pickupGuide" multiline rows={3} value={form.pickupGuide} onChange={set('pickupGuide')} error={errors.pickupGuide} helperText="예: 학생증 지참, 담당자가 소유 여부를 확인해요" />
        <CoordinateFields
          lat={form.lat}
          lng={form.lng}
          buildings={buildings}
          error={errors.coordinates}
          optionalHelp="비워 두면 선택한 건물의 좌표를 써요."
          onChange={({ lat, lng }) => setForm((prev) => ({ ...prev, lat, lng }))}
        />
        <label className="flex min-h-[44px] items-start gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>
            사용 중
            <span className="block text-sub">해제하면 신고 화면과 보관 위치 지정 목록에서 빠져요.</span>
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="flex-1">
            닫기
          </Button>
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? '저장 중…' : '저장'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
