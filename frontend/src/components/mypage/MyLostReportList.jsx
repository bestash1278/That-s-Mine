import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import LostReportStatusActions from '../lost-report/LostReportStatusActions.jsx';
import ListShell from './ListShell.jsx';
import LockNotice from './LockNotice.jsx';
import Thumb from './Thumb.jsx';
import { usePagedList } from './usePagedList.js';
import { deleteLostReport } from '../../api/lostReports.js';
import { getMyLostReports } from '../../api/me.js';
import { toUserError } from '../../api/client.js';
import { formatDate } from '../../utils/dateUtils.js';
import { describeLostLocation, formatLostPeriod } from '../../utils/lostReportForm.js';

const actionLink =
  'inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded border-2 px-3 text-sm font-medium';

/** 내가 등록한 분실 신고 */
export default function MyLostReportList({ onNotice }) {
  const list = usePagedList(useCallback((page, size) => getMyLostReports(page, size), []));
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteLostReport(target.reportId);
      setTarget(null);
      onNotice?.(`'${target.title}' 분실 신고를 삭제했어요.`);
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
        emptyMessage="아직 등록한 분실 신고가 없어요."
        emptyAction={
          <Link to="/report-lost" className="inline-flex min-h-[44px] items-center gap-1 font-medium text-primary underline">
            <Plus size={16} aria-hidden="true" /> 분실 신고하기
          </Link>
        }
      >
        {list.items.map((report) => {
          const reasonId = `lost-lock-${report.reportId}`;
          return (
            <li key={report.reportId} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex gap-3">
                <Thumb url={report.thumbnailUrl} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-text">{report.title}</p>
                    <StatusBadge status={report.status} label={report.statusLabel} />
                  </div>
                  <p className="text-sm text-sub">
                    {report.receiptNo} · {report.categoryName}
                  </p>
                  <p className="text-sm text-sub">{formatLostPeriod(report.lostDate, report.lostEndDate, formatDate)}</p>
                  <p className="text-sm text-sub">{describeLostLocation(report)}</p>
                  {/* 유사 물품 추천(11단계)이 연결되면 서버가 similarItemCount를 채운다. 화면 표시만 하고 알림은 보내지 않는다 */}
                  {report.similarItemCount != null && (
                    <p className="text-sm font-medium text-primary">유사 습득물 {report.similarItemCount}건 (소유 확정 아님)</p>
                  )}
                </div>
              </div>
              <LostReportStatusActions
                report={report}
                onChanged={(updated) => {
                  onNotice?.(`'${updated.title}' 신고를 '${updated.statusLabel}'(으)로 바꿨어요.`);
                  list.reload();
                }}
              />
              <LockNotice id={reasonId} reason={report.lockReason} />
              <div className="flex flex-wrap gap-2">
                <Link to={`/lost-reports/${report.reportId}`} className={`${actionLink} border-gray-300 text-text hover:border-primary`}>
                  상세 보기
                </Link>
                {report.contentEditable ? (
                  <Link
                    to={`/mypage/lost-reports/${report.reportId}/edit`}
                    className={`${actionLink} border-primary text-primary hover:bg-blue-50`}
                    aria-label={`${report.title} 수정`}
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
                  aria-label={`${report.title} 삭제`}
                  onClick={() => setTarget(report)}
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
        title="분실 신고를 삭제할까요?"
        message={`'${target?.title || ''}' 신고가 목록과 지도에서 사라집니다. 삭제한 신고는 되돌릴 수 없어요. 물건을 찾았다면 삭제 대신 '찾았어요'를 눌러도 돼요.`}
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
