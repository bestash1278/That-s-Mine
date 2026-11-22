import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import ListShell from './ListShell.jsx';
import LockNotice from './LockNotice.jsx';
import Thumb from './Thumb.jsx';
import { usePagedList } from './usePagedList.js';
import { deleteFoundItem } from '../../api/foundItems.js';
import { getMyFoundItems } from '../../api/me.js';
import { toUserError } from '../../api/client.js';
import { formatDate } from '../../utils/dateUtils.js';

const actionLink =
  'inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded border-2 px-3 text-sm font-medium';

/** 내가 등록한 습득물 */
export default function MyFoundItemList({ onNotice }) {
  const list = usePagedList(useCallback((page, size) => getMyFoundItems(page, size), []));
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteFoundItem(target.itemId);
      setTarget(null);
      onNotice?.(`'${target.title}' 신고를 삭제했어요.`);
      list.reload();
    } catch (err) {
      setError(toUserError(err, '삭제하지 못했습니다.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ListShell
        list={list}
        emptyMessage="아직 등록한 습득물이 없어요."
        emptyAction={
          <Link to="/report-found" className="inline-flex min-h-[44px] items-center gap-1 font-medium text-primary underline">
            <Plus size={16} aria-hidden="true" /> 습득물 신고하기
          </Link>
        }
      >
        {list.items.map((item) => {
          const reasonId = `found-lock-${item.itemId}`;
          return (
            <li key={item.itemId} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex gap-3">
                <Thumb url={item.thumbnailUrl} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text">{item.title}</p>
                    <StatusBadge status={item.status} label={item.statusLabel} />
                  </div>
                  <p className="text-sm text-sub">
                    {item.itemNo} · {item.categoryName}
                  </p>
                  <p className="text-sm text-sub">
                    발견 {formatDate(item.foundDate)} · {item.foundLocation}
                  </p>
                  <p className="text-sm text-sub">보관 {item.storageStatusLabel}</p>
                </div>
              </div>
              <LockNotice id={reasonId} reason={item.lockReason} />
              <div className="flex flex-wrap gap-2">
                {item.status !== 'HIDDEN' && (
                  <Link to={`/items/${item.itemId}`} className={`${actionLink} border-gray-300 text-text hover:border-primary`}>
                    상세 보기
                  </Link>
                )}
                {item.editable ? (
                  <Link
                    to={`/mypage/found-items/${item.itemId}/edit`}
                    className={`${actionLink} border-primary text-primary hover:bg-blue-50`}
                    aria-label={`${item.title} 수정`}
                  >
                    <Pencil size={16} aria-hidden="true" /> 수정
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled className="flex-1" aria-describedby={reasonId}>
                    <Pencil size={16} className="mr-1" aria-hidden="true" /> 수정
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!item.editable}
                  aria-describedby={item.editable ? undefined : reasonId}
                  aria-label={`${item.title} 삭제`}
                  onClick={() => setTarget(item)}
                  className="flex-1 !border-error !text-error hover:!bg-red-50"
                >
                  <Trash2 size={16} className="mr-1" aria-hidden="true" /> 삭제
                </Button>
              </div>
            </li>
          );
        })}
      </ListShell>
      <ConfirmDialog
        isOpen={Boolean(target)}
        title="습득물 신고를 삭제할까요?"
        message={`'${target?.title || ''}' 신고가 분실물 조회와 지도에서 사라집니다. 삭제한 신고는 되돌릴 수 없어요.`}
        confirmLabel="삭제"
        danger
        busy={busy}
        error={error}
        onConfirm={remove}
        onCancel={() => {
          setTarget(null);
          setError(null);
        }}
      />
    </>
  );
}
