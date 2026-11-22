import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ImageOff, Lock, MapPin, Pencil, Trash2 } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import LostReportStatusActions from '../components/lost-report/LostReportStatusActions.jsx';
import MatchList from '../components/lost-report/MatchList.jsx';
import { deleteLostReport, getLostReport } from '../api/lostReports.js';
import { toUserError } from '../api/client.js';
import { formatDate } from '../utils/dateUtils.js';
import { describeLostLocation, formatLostPeriod } from '../utils/lostReportForm.js';

/**
 * 분실 신고 상세. 누구나 볼 수 있고(신고자 정보는 없음), 본인이면 수정·상태 변경·삭제를 할 수 있다.
 */
export default function LostReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await getLostReport(id));
    } catch (err) {
      setError(toUserError(err, '분실 신고를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // 마이페이지의 "유사 습득물 N건 보기"로 들어오면 추천 영역으로 이동한다(추천은 화면이 그려진 뒤에 생긴다)
  useEffect(() => {
    if (hash === '#matches' && report?.mine) {
      document.getElementById('matches')?.scrollIntoView({ block: 'start' });
    }
  }, [hash, report?.mine]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteLostReport(id);
      navigate('/mypage?tab=lost', { replace: true, state: { notice: '분실 신고를 삭제했습니다.' } });
    } catch (err) {
      setDeleteError(toUserError(err, '삭제하지 못했습니다.').message);
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) {
    return error.status === 404 ? (
      <ErrorState message="분실 신고를 찾을 수 없어요. 이미 삭제되었을 수 있어요." />
    ) : (
      <ErrorState message={error.message} onRetry={load} />
    );
  }

  const images = report.imageUrls || [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ChevronLeft size={18} aria-hidden="true" /> 이전 화면
      </button>

      <Card className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">분실 신고</span>
            <StatusBadge status={report.status} label={report.statusLabel} />
            <span className="text-sm text-sub">{report.receiptNo}</span>
          </div>
          <h1 className="text-2xl font-bold text-text">{report.title}</h1>
          <p className="text-sm text-sub">{report.categoryName}</p>
        </div>

        {images.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2" aria-label="분실물 사진">
            {images.map((url, i) => (
              <li key={url} className="aspect-square overflow-hidden rounded bg-gray-100">
                <img src={url} alt={`${report.title} 사진 ${i + 1}`} className="h-full w-full object-cover" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-sub">
            <ImageOff size={16} aria-hidden="true" /> 등록된 사진이 없어요.
          </p>
        )}

        <dl className="space-y-3 text-sm">
          <div className="flex gap-2">
            <dt className="flex w-24 flex-shrink-0 items-center gap-1 text-sub">
              <CalendarDays size={16} aria-hidden="true" /> 잃어버린 때
            </dt>
            <dd className="text-text">{formatLostPeriod(report.lostDate, report.lostEndDate, formatDate)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="flex w-24 flex-shrink-0 items-center gap-1 text-sub">
              <MapPin size={16} className="text-orange-600" aria-hidden="true" /> 추정 위치
            </dt>
            <dd className="text-text">
              {describeLostLocation(report)}
              {report.lostLocationDetail && <span className="block text-sub">{report.lostLocationDetail}</span>}
              {report.markerApproximate && <span className="block text-xs text-sub">지도에는 건물 위치로 표시돼요.</span>}
            </dd>
          </div>
          {report.description && (
            <div className="flex gap-2">
              <dt className="w-24 flex-shrink-0 text-sub">특징</dt>
              <dd className="whitespace-pre-line text-text">{report.description}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-24 flex-shrink-0 text-sub">접수일</dt>
            <dd className="text-text">{formatDate(report.createdAt)}</dd>
          </div>
        </dl>

        {!report.mine && (
          <p className="rounded bg-gray-50 p-3 text-sm text-sub">
            이 물건을 주웠다면 습득물로 신고해 주세요. 신고자 연락처는 공개되지 않아요.{' '}
            <Link to="/report-found" className="font-medium text-primary underline">
              습득물 신고하기
            </Link>
          </p>
        )}
      </Card>

      {report.mine && report.status === 'SEARCHING' && (
        <Card className="space-y-3">
          <h2 id="matches" className="scroll-mt-4 font-bold text-text">
            비슷한 습득물
          </h2>
          <MatchList reportId={report.reportId} searchQuery={new URLSearchParams({ categoryId: String(report.categoryId), startDate: report.lostDate }).toString()} />
        </Card>
      )}

      {report.mine && (
        <Card className="space-y-4">
          <h2 className="font-bold text-text">내 신고 관리</h2>
          <LostReportStatusActions report={report} onChanged={setReport} />
          {!report.contentEditable && report.lockReason && (
            <p id="lost-lock-reason" className="flex gap-2 rounded bg-gray-50 p-3 text-sm text-sub">
              <Lock size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> {report.lockReason}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {report.contentEditable ? (
              <Link
                to={`/mypage/lost-reports/${report.reportId}/edit`}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded border-2 border-primary px-4 font-medium text-primary hover:bg-blue-50"
              >
                <Pencil size={16} aria-hidden="true" /> 내용 수정
              </Link>
            ) : (
              <Button variant="outline" disabled className="flex-1" aria-describedby="lost-lock-reason">
                <Pencil size={16} className="mr-2" aria-hidden="true" /> 내용 수정
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="flex-1 !border-error !text-error hover:!bg-red-50"
            >
              <Trash2 size={16} className="mr-2" aria-hidden="true" /> 삭제
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="분실 신고를 삭제할까요?"
        message={`'${report.title}' 신고가 목록과 지도에서 사라집니다. 삭제한 신고는 되돌릴 수 없어요. 물건을 찾았다면 삭제 대신 '찾기 완료'로 바꿀 수도 있어요.`}
        confirmLabel="삭제"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
