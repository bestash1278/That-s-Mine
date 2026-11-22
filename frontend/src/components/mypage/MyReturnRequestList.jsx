import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';
import ListShell from './ListShell.jsx';
import Thumb from './Thumb.jsx';
import { usePagedList } from './usePagedList.js';
import { getMyReturnRequests } from '../../api/me.js';
import { formatDate } from '../../utils/dateUtils.js';

/** 상태별로 다음에 할 일을 짧게 안내 */
const NEXT_STEP = {
  PENDING: '관리 부서가 소유 여부를 확인하고 있어요.',
  APPROVED: '승인되었어요. 보관 장소에서 신분 확인 후 받아 가세요.',
  REJECTED: '소유 확인이 되지 않아 반려되었어요.',
  COMPLETED: '물건을 돌려받았어요.',
  CANCELLED: '신청을 취소했어요.',
};

/** 반환 신청 내역 (조회만. 신청·취소는 10단계) */
export default function MyReturnRequestList() {
  const list = usePagedList(useCallback((page, size) => getMyReturnRequests(page, size), []));

  return (
    <ListShell
      list={list}
      emptyMessage="아직 반환 신청한 물품이 없어요. 내 물건을 찾으면 상세 화면에서 반환을 신청할 수 있어요."
      emptyAction={
        <Link to="/items" className="inline-flex min-h-[44px] items-center font-medium text-primary underline">
          분실물 찾아보기
        </Link>
      }
    >
      {list.items.map((request) => (
        <li key={request.requestId} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex gap-3">
            <Thumb url={request.itemThumbnailUrl} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-text">{request.itemTitle}</p>
                <StatusBadge status={request.status} label={request.statusLabel} />
              </div>
              <p className="text-sm text-sub">신청 {formatDate(request.createdAt)}</p>
              {request.processedAt && <p className="text-sm text-sub">처리 {formatDate(request.processedAt)}</p>}
              <p className="text-sm text-text">{NEXT_STEP[request.status]}</p>
            </div>
          </div>
          {request.reviewComment && (
            <p className="rounded bg-gray-50 p-2 text-sm text-text">
              <span className="font-medium">담당자 메모:</span> {request.reviewComment}
            </p>
          )}
          {request.ownershipDescription && (
            <details className="text-sm">
              <summary className="min-h-[44px] cursor-pointer py-2 font-medium text-primary">내가 적은 소유 확인 설명 보기</summary>
              <p className="whitespace-pre-line rounded bg-blue-50 p-2 text-text">{request.ownershipDescription}</p>
            </details>
          )}
          {request.itemViewable ? (
            <Link
              to={`/items/${request.itemId}`}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded border-2 border-gray-300 px-3 text-sm font-medium text-text hover:border-primary"
            >
              물품 상세 보기
            </Link>
          ) : (
            <p className="text-sm text-sub">이 물품은 삭제되었거나 비공개 상태라 상세 화면을 열 수 없어요.</p>
          )}
        </li>
      ))}
    </ListShell>
  );
}
