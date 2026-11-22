import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Archive, ArrowLeft, CheckCircle, Clock, MapPin, Phone } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import Input from '../components/common/Input.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import client, { toUserError } from '../api/client.js';
import { createReturnRequest, getReturnEligibility } from '../api/returnRequests.js';
import { formatDate } from '../utils/dateUtils.js';
import { validateReturnForm } from '../utils/returnRequestForm.js';

/**
 * 반환 신청 (SPEC §15). 상세 화면의 "반환 신청"에서 들어온다(로그인 필요).
 * 소유 확인 특징은 담당자에게만 보이고 다른 사용자에게는 공개되지 않는다. 자동으로 소유를 판정하지 않는다.
 */
export default function ReturnRequestPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: null, item: null, eligibility: null });
  const [form, setForm] = useState({ ownershipDescription: '', additionalNote: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const headingRef = useRef(null);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [itemResponse, eligibility] = await Promise.all([client.get(`/found-items/${id}`), getReturnEligibility(id)]);
      setState({ loading: false, error: null, item: itemResponse.data?.data, eligibility });
    } catch (err) {
      const { message, status } = toUserError(err, '물품 정보를 불러오지 못했습니다.');
      setState({ loading: false, error: status === 404 ? '물품을 찾을 수 없습니다. 삭제되었거나 숨김 처리된 물품일 수 있어요.' : message, item: null, eligibility: null });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (done) headingRef.current?.focus();
  }, [done]);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const found = validateReturnForm(form);
    setErrors(found);
    setSubmitError('');
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const created = await createReturnRequest(id, {
        ownershipDescription: form.ownershipDescription.trim(),
        additionalNote: form.additionalNote.trim() || undefined,
      });
      setDone(created);
    } catch (err) {
      const { message, fieldErrors, status } = toUserError(err, '반환 신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrors(fieldErrors);
      setSubmitError(Object.keys(fieldErrors).length > 0 ? '입력한 내용을 확인해 주세요.' : message);
      if (status === 409) load(); // 그 사이 물품 상태가 바뀌었을 수 있으니 안내를 새로 불러온다
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error || !state.item) return <ErrorState message={state.error} onRetry={load} />;

  const { item, eligibility } = state;
  const storage = item.storageInfo;

  const back = (
    <Link to={`/items/${id}`} className="inline-flex min-h-[44px] items-center gap-1 font-medium text-primary underline">
      <ArrowLeft size={18} aria-hidden="true" /> 물품 상세로
    </Link>
  );

  if (done) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Card className="space-y-3 text-center">
          <CheckCircle size={40} className="mx-auto text-success" aria-hidden="true" />
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-text focus:outline-none">
            반환 신청이 접수되었어요
          </h1>
          <p className="text-text">
            <span className="font-medium">{item.title}</span> · 접수 {formatDate(done.createdAt)} · <StatusBadge status={done.status} label={done.statusLabel} />
          </p>
          <p className="text-sm text-sub">담당자가 소유 여부를 확인한 뒤 승인 또는 반려해요. 결과는 마이페이지에서 확인할 수 있어요.</p>
        </Card>
        <StorageGuide storage={storage} isTemporary={item.custodyType === 'TEMPORARY'} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/mypage?tab=returns" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded bg-primary px-4 font-medium text-white hover:bg-blue-900">
            마이페이지에서 진행 상황 보기
          </Link>
          <Link to="/items" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded border-2 border-primary px-4 font-medium text-primary hover:bg-blue-50">
            다른 물품 보기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-8">
      {back}
      <div>
        <h1 className="text-2xl font-bold text-text">반환 신청</h1>
        <p className="mt-1 text-sub">내 물건이 맞다고 생각될 때 신청해 주세요. 신청해도 바로 돌려받는 것은 아니에요.</p>
      </div>

      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-text">{item.title}</h2>
          <StatusBadge status={item.status} label={item.statusLabel} />
        </div>
        <p className="flex items-start gap-2 text-sm text-text">
          <MapPin size={16} className="mt-0.5 flex-shrink-0 text-error" aria-hidden="true" />
          <span>
            <span className="text-sub">발견한 곳 </span>
            {item.foundLocation} · {item.foundDate}
          </span>
        </p>
        <p className="flex items-start gap-2 text-sm text-text">
          <Archive size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
          <span>
            <span className="text-sub">지금 보관 중인 곳 </span>
            {item.storageName || item.storageStatusLabel || '보관 장소 확인 중'}
          </span>
        </p>
      </Card>

      {!eligibility?.canRequest ? (
        <Card className="space-y-3">
          <p role="status" className="flex items-start gap-2 text-text">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-yellow-700" aria-hidden="true" />
            <span>{eligibility?.blockReason || '지금은 반환 신청을 할 수 없는 물품입니다.'}</span>
          </p>
          {eligibility?.myRequest && (
            <p className="text-sm text-text">
              내 신청: <StatusBadge status={eligibility.myRequest.status} label={eligibility.myRequest.statusLabel} />{' '}
              <Link to="/mypage?tab=returns" className="font-medium text-primary underline">
                마이페이지에서 보기
              </Link>
            </p>
          )}
        </Card>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <Card className="space-y-4">
            <Input
              label="내 물건이라고 판단한 근거"
              name="ownershipDescription"
              multiline
              rows={5}
              required
              value={form.ownershipDescription}
              onChange={change}
              error={errors.ownershipDescription}
              maxLength={550}
              helperText="사진에 보이지 않는 특징을 적어 주세요. 예: 안쪽에 든 물건, 흠집·스티커 위치, 열쇠고리 모양"
            />
            <Input
              label="추가 설명 (선택)"
              name="additionalNote"
              multiline
              rows={3}
              value={form.additionalNote}
              onChange={change}
              error={errors.additionalNote}
              helperText="언제, 어디서 잃어버렸는지 등 담당자가 알면 좋은 내용"
            />
          </Card>

          <div className="space-y-2 rounded-lg bg-blue-50 p-3 text-sm text-text">
            <p>
              <span className="font-medium">이 내용은 담당자에게만 보여요.</span> 다른 사용자에게는 공개되지 않아요. 이름·학번·연락처는 적지 않아도 돼요.
            </p>
            <p>조회 결과는 소유권 증명이 아니에요. 실제 수령 시 담당자가 소유 여부를 확인합니다.</p>
          </div>

          {submitError && (
            <p role="alert" className="rounded bg-red-50 p-3 text-sm text-error">
              {submitError}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? '접수하는 중…' : '반환 신청하기'}
          </Button>
        </form>
      )}

      <StorageGuide storage={storage} isTemporary={item.custodyType === 'TEMPORARY'} />
    </div>
  );
}

/** 신청한 뒤 어떻게 찾아가는지(문의처·운영 시간·수령 절차) */
function StorageGuide({ storage, isTemporary }) {
  if (isTemporary) {
    return (
      <Card className="space-y-1">
        <h2 className="font-medium text-text">찾아가는 방법</h2>
        <p className="text-sm text-text">습득자가 보관 중인 물품이에요. 습득자의 연락처는 공개되지 않고, 신청하면 관리 부서가 연결해 드려요.</p>
      </Card>
    );
  }
  if (!storage) return null;
  return (
    <Card className="space-y-2">
      <h2 className="font-medium text-text">찾아가는 방법</h2>
      <p className="text-sm text-text">
        {storage.buildingName} · {storage.storageName}
        {storage.detailLocation ? ` · ${storage.detailLocation}` : ''}
      </p>
      {storage.operatingHours && (
        <p className="flex items-start gap-2 text-sm text-text">
          <Clock size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" /> 운영 시간 {storage.operatingHours}
        </p>
      )}
      {storage.contactPhone && (
        <p className="flex items-start gap-2 text-sm text-text">
          <Phone size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" /> 문의처 {storage.contactPhone}
        </p>
      )}
      {storage.pickupGuide && <p className="whitespace-pre-line text-sm text-text">수령 시 준비물: {storage.pickupGuide}</p>}
    </Card>
  );
}
