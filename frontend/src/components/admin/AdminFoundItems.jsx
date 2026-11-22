import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, MapPin } from 'lucide-react';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import Input from '../common/Input.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import ChoiceGroup from '../found-item/ChoiceGroup.jsx';
import ListShell from '../mypage/ListShell.jsx';
import Thumb from '../mypage/Thumb.jsx';
import { usePagedList } from '../mypage/usePagedList.js';
import { changeFoundItemStatus, getAdminFoundItems, updateFoundItemLocation, updateFoundItemStorage } from '../../api/admin.js';
import { toUserError } from '../../api/client.js';
import { CUSTODY_TYPE_OPTIONS, CustodyType } from '../../constants/custodyTypes.js';
import { itemStatusActionLabels, statusLabels } from '../../constants/status.js';
import { useReferenceData } from '../../hooks/useReferenceData.js';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  ...['REPORTED', 'STORED', 'RETURN_PENDING', 'RETURNED', 'HIDDEN'].map((value) => ({ value, label: statusLabels[value] })),
];

/** 전체 습득물: 숨김·상태 변경, 실제 보관 위치 지정, 발견 위치 수정. 허용되는 처리는 서버가 알려 준 목록만 보여준다. */
export default function AdminFoundItems({ onNotice }) {
  const [draft, setDraft] = useState({ keyword: '', status: '' });
  const [applied, setApplied] = useState({ keyword: '', status: '' });
  const list = usePagedList(useCallback((page, size) => getAdminFoundItems({ ...applied, page, size }), [applied]));
  const reference = useReferenceData();
  const [dialog, setDialog] = useState(null); // { type: 'status' | 'storage' | 'location', item, status? }

  const search = (e) => {
    e.preventDefault();
    setApplied({ keyword: draft.keyword.trim(), status: draft.status });
  };

  const done = (message) => {
    setDialog(null);
    onNotice?.(message);
    list.reload();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} role="search" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <Input
          label="검색어"
          name="adminItemKeyword"
          value={draft.keyword}
          onChange={(e) => setDraft((prev) => ({ ...prev, keyword: e.target.value }))}
          helperText="물품명·특징·비공개 특징·발견 장소에서 찾아요"
        />
        <Select
          label="처리 상태"
          name="adminItemStatus"
          options={STATUS_OPTIONS}
          value={draft.status}
          onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
        />
        <Button type="submit">검색</Button>
      </form>

      <ListShell list={list} emptyMessage="조건에 맞는 습득물이 없어요.">
        {list.items.map((item) => (
          <li key={item.itemId} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex gap-3">
              <Thumb url={item.imageUrls?.[0]} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text">{item.title}</p>
                  <StatusBadge status={item.status} label={item.statusLabel} />
                  {item.pendingReturnRequests > 0 && (
                    <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-900">
                      반환 신청 {item.pendingReturnRequests}건 대기
                    </span>
                  )}
                </div>
                <p className="text-sm text-sub">
                  {item.categoryName} · 신고자 {item.reporterName}
                </p>
                <p className="flex items-start gap-1 text-sm text-text">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0 text-error" aria-hidden="true" />
                  <span>
                    <span className="text-sub">발견한 곳 </span>
                    {item.foundLocation}
                    {item.foundLocationDetail ? ` · ${item.foundLocationDetail}` : ''} · {item.foundDate}
                  </span>
                </p>
                <p className="flex items-start gap-1 text-sm text-text">
                  <Archive size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <span className="text-sub">지금 보관 중인 곳 </span>
                    {item.storageName || item.storageLocation || item.storageStatusLabel}
                    {item.custodyTypeLabel ? ` (${item.custodyTypeLabel})` : ''}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(item.allowedStatuses || []).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={status === 'HIDDEN' ? 'secondary' : 'outline'}
                  onClick={() => setDialog({ type: 'status', item, status })}
                >
                  {itemStatusActionLabels[status]}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ type: 'storage', item })}>
                보관 위치 지정
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ type: 'location', item })}>
                발견 위치 수정
              </Button>
              {item.status !== 'HIDDEN' && (
                <Link
                  to={`/items/${item.itemId}`}
                  className="inline-flex min-h-[44px] items-center rounded border-2 border-gray-300 px-3 text-sm font-medium text-text hover:border-primary"
                >
                  상세 보기
                </Link>
              )}
            </div>
            {(item.status === 'RETURN_PENDING' || item.status === 'RETURNED') && (
              <p className="text-xs text-sub">반환 진행·완료 상태는 "반환 신청" 탭에서 신청을 처리하면 바뀌어요.</p>
            )}
          </li>
        ))}
      </ListShell>

      {dialog?.type === 'status' && <StatusDialog dialog={dialog} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.type === 'storage' && (
        <StorageDialog item={dialog.item} storageLocations={reference.storageLocations} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog?.type === 'location' && (
        <FoundLocationDialog item={dialog.item} buildings={reference.buildings} onClose={() => setDialog(null)} onDone={done} />
      )}
    </div>
  );
}

function StatusDialog({ dialog, onClose, onDone }) {
  const { item, status } = dialog;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await changeFoundItemStatus(item.itemId, status);
      onDone(`'${item.title}'을(를) '${statusLabels[status]}' 상태로 바꿨어요.`);
    } catch (err) {
      setError(toUserError(err, '상태를 바꾸지 못했습니다.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      isOpen
      title={itemStatusActionLabels[status]}
      message={
        status === 'HIDDEN'
          ? `'${item.title}'을(를) 숨기면 조회·지도·상세에서 사라지고 신고자도 수정할 수 없어요. 나중에 되돌릴 수 있어요.`
          : `'${item.title}'의 처리 상태를 '${statusLabels[status]}'(으)로 바꿀까요?`
      }
      confirmLabel={itemStatusActionLabels[status]}
      cancelLabel="닫기"
      danger={status === 'HIDDEN'}
      busy={busy}
      error={error}
      onConfirm={confirm}
      onCancel={() => !busy && onClose()}
    />
  );
}

function StorageDialog({ item, storageLocations, onClose, onDone }) {
  const [custodyType, setCustodyType] = useState(item.custodyType || CustodyType.PENDING_HANDOVER);
  const [storageId, setStorageId] = useState(item.storageInfo?.storageId ? String(item.storageInfo.storageId) : '');
  const [detail, setDetail] = useState(item.storageLocationDetail || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (custodyType === CustodyType.HANDED_OVER && !storageId) {
      setErrors({ storageId: '물품이 보관된 장소를 선택해 주세요.' });
      return;
    }
    setBusy(true);
    setError('');
    setErrors({});
    try {
      const body =
        custodyType === CustodyType.HANDED_OVER
          ? { custodyType, storageId: Number(storageId), storageLocationDetail: detail.trim() || undefined }
          : { custodyType };
      await updateFoundItemStorage(item.itemId, body);
      onDone(`'${item.title}'의 보관 위치를 저장했어요.`);
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '보관 위치를 저장하지 못했습니다.');
      setErrors(fieldErrors);
      setError(Object.keys(fieldErrors).length > 0 ? '입력한 내용을 확인해 주세요.' : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen title="실제 보관 위치 지정" onClose={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-text">
          <span className="font-medium">{item.title}</span>이(가) 지금 어디에 있는지 지정해요. 발견한 곳은 바뀌지 않아요.
        </p>
        <ChoiceGroup
          name="custodyType"
          legend="보관 상태"
          required
          options={CUSTODY_TYPE_OPTIONS}
          value={custodyType}
          onChange={setCustodyType}
          columns="grid-cols-1"
        />
        {custodyType === CustodyType.HANDED_OVER && (
          <>
            <Select
              label="보관 장소"
              name="storageId"
              required
              placeholder="보관 장소를 선택해 주세요"
              options={storageLocations.map((s) => ({ id: s.storageId, name: `${s.buildingName} · ${s.storageName}` }))}
              value={storageId}
              onChange={(e) => {
                setStorageId(e.target.value);
                setErrors({});
              }}
              error={errors.storageId}
            />
            <Input
              label="상세 위치 (선택)"
              name="storageLocationDetail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              error={errors.storageLocationDetail}
              helperText="예: 2번 창구, 분실물 보관함 3번"
              maxLength={255}
            />
          </>
        )}
        <p className="text-xs text-sub">
          '관리 부서에 전달 완료'로 지정하면 신고 접수 상태의 물품은 '보관 중'으로 바뀌고, '전달 예정'으로 되돌리면 다시 '신고 접수'가 돼요.
        </p>
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

function FoundLocationDialog({ item, buildings, onClose, onDone }) {
  const hasCoords = item.foundLatitude != null && item.foundLongitude != null;
  const currentBuilding = buildings.find((b) => b.buildingName === item.foundBuildingName);
  const [buildingId, setBuildingId] = useState(currentBuilding ? String(currentBuilding.buildingId) : '');
  const [place, setPlace] = useState(item.foundLocation || '');
  const [detail, setDetail] = useState(item.foundLocationDetail || '');
  const [keepCoords, setKeepCoords] = useState(hasCoords);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!buildingId && !place.trim()) {
      setErrors({ foundLocation: '발견 위치를 선택하거나 입력해 주세요.' });
      return;
    }
    setBusy(true);
    setError('');
    setErrors({});
    try {
      await updateFoundItemLocation(item.itemId, {
        foundBuildingId: buildingId ? Number(buildingId) : null,
        foundLocation: place.trim() || undefined,
        foundLocationDetail: detail.trim() || undefined,
        foundLatitude: keepCoords && hasCoords ? item.foundLatitude : null,
        foundLongitude: keepCoords && hasCoords ? item.foundLongitude : null,
      });
      onDone(`'${item.title}'의 발견 위치를 수정했어요.`);
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '발견 위치를 수정하지 못했습니다.');
      setErrors(fieldErrors);
      setError(Object.keys(fieldErrors).length > 0 ? '입력한 내용을 확인해 주세요.' : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen title="발견 위치 수정" onClose={() => !busy && onClose()}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-text">
          잘못 입력된 <span className="font-medium">발견한 곳</span>을 바로잡아요. 지금 보관 중인 곳은 바뀌지 않아요.
        </p>
        <Select
          label="발견한 건물"
          name="foundBuildingId"
          placeholder="건물 없음 (직접 입력)"
          options={buildings.map((b) => ({ id: b.buildingId, name: b.buildingName }))}
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          error={errors.foundBuildingId}
        />
        <Input
          label="발견 장소 이름"
          name="foundLocation"
          value={place}
          onChange={(e) => {
            setPlace(e.target.value);
            setErrors({});
          }}
          error={errors.foundLocation}
          helperText="비워 두면 선택한 건물 이름을 써요"
          maxLength={255}
        />
        <Input
          label="상세 위치 (선택)"
          name="foundLocationDetail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          error={errors.foundLocationDetail}
          maxLength={255}
        />
        {hasCoords && (
          <label className="flex min-h-[44px] items-start gap-2 text-sm text-text">
            <input type="checkbox" checked={keepCoords} onChange={(e) => setKeepCoords(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
            <span>
              지도에 찍힌 기존 위치 유지
              <span className="block text-sub">장소를 크게 바꿨다면 해제해 주세요. 해제하면 지도에는 건물 위치로 표시돼요.</span>
            </span>
          </label>
        )}
        {errors.foundCoordinates && <p className="text-sm text-error">{errors.foundCoordinates}</p>}
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
