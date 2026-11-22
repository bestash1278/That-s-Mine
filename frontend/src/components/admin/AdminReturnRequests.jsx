import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import ListShell from '../mypage/ListShell.jsx';
import Thumb from '../mypage/Thumb.jsx';
import { usePagedList } from '../mypage/usePagedList.js';
import { getAdminReturnRequests, reviewReturnRequest } from '../../api/admin.js';
import { toUserError } from '../../api/client.js';
import { returnRequestStatusLabels, returnReviewActionLabels } from '../../constants/status.js';
import { formatDate } from '../../utils/dateUtils.js';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(returnRequestStatusLabels).map(([value, label]) => ({ value, label })),
];

const DIALOG_HELP = {
  APPROVED: '승인하면 물품이 "반환 진행 중"이 되어 다른 신청은 승인할 수 없어요. 신청자는 보관 장소에서 신분 확인 후 받아 가요.',
  REJECTED: '반려 사유는 신청자에게 그대로 보여요. 승인된 신청을 반려하면 물품이 다시 보관 중으로 돌아가요.',
  COMPLETED: '물건을 실제로 건넸을 때만 눌러 주세요. 물품이 "반환 완료"가 되고, 남은 대기 신청은 자동으로 반려돼요.',
};

/** 반환 신청 처리 (승인·반려·반환 완료). 소유 여부는 담당자가 신청 설명과 습득자의 비공개 특징을 대조해 판단한다. */
export default function AdminReturnRequests({ onNotice }) {
  const [status, setStatus] = useState('PENDING');
  const list = usePagedList(useCallback((page, size) => getAdminReturnRequests({ status, page, size }), [status]));
  const [dialog, setDialog] = useState(null); // { request, action }
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const open = (request, action) => {
    setDialog({ request, action });
    setComment('');
    setError('');
    setFieldError('');
  };

  const close = () => {
    if (!busy) setDialog(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !dialog) return;
    const { request, action } = dialog;
    if (action === 'REJECTED' && !comment.trim()) {
      setFieldError('반려 사유를 입력해 주세요. 신청자에게 그대로 보입니다.');
      return;
    }
    setBusy(true);
    setError('');
    setFieldError('');
    try {
      await reviewReturnRequest(request.requestId, action, comment.trim() || undefined);
      onNotice?.(`'${request.itemTitle}' 신청을 ${returnReviewActionLabels[action]}했어요.`);
      setDialog(null);
      list.reload();
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      if (fieldErrors.comment) setFieldError(fieldErrors.comment);
      else setError(message);
      if (!fieldErrors.comment) list.reload(); // 다른 관리자가 먼저 처리했을 수 있다
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select
          label="처리 상태"
          name="returnStatusFilter"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>

      <ListShell list={list} emptyMessage={status === 'PENDING' ? '처리를 기다리는 반환 신청이 없어요.' : '조건에 맞는 반환 신청이 없어요.'}>
        {list.items.map((request) => (
          <li key={request.requestId} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex gap-3">
              <Thumb url={request.itemThumbnailUrl} />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text">{request.itemTitle}</p>
                  <StatusBadge status={request.status} label={request.statusLabel} />
                </div>
                <p className="text-sm text-sub">
                  물품 상태: {request.itemStatusLabel}
                  {request.storageName ? ` · 보관: ${request.storageName}` : ''}
                </p>
                <p className="text-sm text-sub">
                  신청자 {request.requesterNickname} ({request.requesterEmail}) · 신청 {formatDate(request.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded bg-blue-50 p-2">
                <p className="text-sm font-medium text-text">신청자가 적은 소유 확인 설명</p>
                <p className="whitespace-pre-line text-sm text-text">{request.ownershipDescription || '(내용 없음)'}</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-sm font-medium text-text">습득자가 남긴 비공개 특징</p>
                <p className="whitespace-pre-line text-sm text-text">{request.itemPrivateFeatures || '남긴 특징이 없어요.'}</p>
              </div>
            </div>
            <p className="text-xs text-sub">두 내용을 담당자가 직접 대조해 판단해요. 시스템이 소유 여부를 자동으로 판정하지 않아요.</p>

            {request.reviewComment && (
              <p className="rounded bg-gray-50 p-2 text-sm text-text">
                <span className="font-medium">처리 메모:</span> {request.reviewComment}
                {request.processedAt && <span className="text-sub"> ({formatDate(request.processedAt)})</span>}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {(request.allowedNext || []).map((action) => (
                <Button
                  key={action}
                  type="button"
                  size="sm"
                  variant={action === 'REJECTED' ? 'secondary' : 'primary'}
                  onClick={() => open(request, action)}
                >
                  {returnReviewActionLabels[action]}
                </Button>
              ))}
              {request.itemStatus !== 'HIDDEN' && (
                <Link
                  to={`/items/${request.itemId}`}
                  className="inline-flex min-h-[44px] items-center rounded border-2 border-gray-300 px-3 text-sm font-medium text-text hover:border-primary"
                >
                  물품 상세
                </Link>
              )}
            </div>
          </li>
        ))}
      </ListShell>

      <Modal
        isOpen={Boolean(dialog)}
        title={dialog ? `${dialog.request.itemTitle} · ${returnReviewActionLabels[dialog.action]}` : ''}
        onClose={close}
      >
        {dialog && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <p className="text-sm text-text">{DIALOG_HELP[dialog.action]}</p>
            <Input
              label={dialog.action === 'REJECTED' ? '반려 사유' : '처리 메모 (선택)'}
              name="reviewComment"
              multiline
              rows={3}
              required={dialog.action === 'REJECTED'}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                setFieldError('');
              }}
              error={fieldError}
              helperText="신청자의 마이페이지에 표시돼요. 개인정보는 적지 마세요."
              maxLength={500}
            />
            {error && (
              <p role="alert" className="rounded bg-red-50 p-3 text-sm text-error">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={close} disabled={busy} className="flex-1">
                닫기
              </Button>
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? '처리 중…' : returnReviewActionLabels[dialog.action]}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
