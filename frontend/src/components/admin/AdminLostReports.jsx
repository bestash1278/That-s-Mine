import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import StatusBadge from '../common/StatusBadge.jsx';
import ListShell from '../mypage/ListShell.jsx';
import Thumb from '../mypage/Thumb.jsx';
import { usePagedList } from '../mypage/usePagedList.js';
import { changeLostReportStatus, getAdminLostReports } from '../../api/admin.js';
import { toUserError } from '../../api/client.js';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { lostReportStatusLabels } from '../../constants/status.js';
import { formatDate } from '../../utils/dateUtils.js';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(lostReportStatusLabels).map(([value, label]) => ({ value, label })),
];

/**
 * 전체 분실 신고 조회(모든 상태)와 상태 변경(찾는 중 / 찾기 완료 / 신고 종료). 신고자 정보는 화면에 표시하지 않는다.
 * 내용은 신고자만 고칠 수 있고, 관리자는 상태만 바꾼다.
 */
export default function AdminLostReports({ onNotice }) {
  const [draft, setDraft] = useState({ keyword: '', status: '' });
  const [applied, setApplied] = useState({ keyword: '', status: '' });
  const list = usePagedList(useCallback((page, size) => getAdminLostReports({ ...applied, page, size }), [applied]));
  const [target, setTarget] = useState(null); // { report, status }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setTarget(null);
    setError('');
  };

  const confirm = async () => {
    if (busy || !target) return;
    setBusy(true);
    setError('');
    try {
      await changeLostReportStatus(target.report.reportId, target.status);
      onNotice?.(`'${target.report.title}' 신고를 '${lostReportStatusLabels[target.status]}'(으)로 바꿨어요.`);
      setTarget(null);
      list.reload();
    } catch (err) {
      setError(toUserError(err, '상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.').message);
      list.reload(); // 그 사이 신고자가 먼저 바꿨을 수 있다
    } finally {
      setBusy(false);
    }
  };

  const search = (e) => {
    e.preventDefault();
    setApplied({ keyword: draft.keyword.trim(), status: draft.status });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} role="search" className="grid gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <Input
          label="검색어"
          name="adminLostKeyword"
          value={draft.keyword}
          onChange={(e) => setDraft((prev) => ({ ...prev, keyword: e.target.value }))}
        />
        <Select
          label="신고 상태"
          name="adminLostStatus"
          options={STATUS_OPTIONS}
          value={draft.status}
          onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
        />
        <Button type="submit">검색</Button>
      </form>

      <ListShell list={list} emptyMessage="조건에 맞는 분실 신고가 없어요.">
        {list.items.map((report) => (
          <li key={report.reportId} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <Thumb url={report.thumbnailUrl} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-text">{report.title}</p>
                <StatusBadge status={report.status} label={report.statusLabel} />
              </div>
              <p className="text-sm text-sub">
                접수 번호 {report.receiptNo} · {report.categoryName} · 접수 {formatDate(report.createdAt)}
              </p>
              <p className="flex items-start gap-1 text-sm text-text">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-orange-600" aria-hidden="true" />
                <span>
                  <span className="text-sub">잃어버린 곳 </span>
                  {report.lostLocation}
                  {report.lostLocationDetail ? ` · ${report.lostLocationDetail}` : ''} · {report.lostDate}
                  {report.lostEndDate ? ` ~ ${report.lostEndDate}` : ''}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(lostReportStatusLabels)
                  .filter(([value]) => value !== report.status)
                  .map(([value, label]) => (
                    <Button key={value} type="button" size="sm" variant="outline" onClick={() => setTarget({ report, status: value })}>
                      {label}(으)로 변경
                    </Button>
                  ))}
                <Link
                  to={`/lost-reports/${report.reportId}`}
                  className="inline-flex min-h-[44px] items-center font-medium text-primary underline"
                >
                  상세 보기
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ListShell>

      <ConfirmDialog
        isOpen={Boolean(target)}
        title="분실 신고 상태 변경"
        message={target ? `'${target.report.title}' 신고를 '${lostReportStatusLabels[target.status]}' 상태로 바꿀까요? 신고 내용은 바뀌지 않고, 신고자는 마이페이지에서 바뀐 상태를 보게 돼요.` : ''}
        confirmLabel="상태 변경"
        cancelLabel="닫기"
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={close}
      />
    </div>
  );
}
