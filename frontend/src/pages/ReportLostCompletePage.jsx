import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Card from '../components/common/Card.jsx';
import MatchList from '../components/lost-report/MatchList.jsx';
import { getLostReport } from '../api/lostReports.js';
import { toUserError } from '../api/client.js';
import { formatDate } from '../utils/dateUtils.js';
import { describeLostLocation, formatLostPeriod } from '../utils/lostReportForm.js';

/**
 * 분실 신고 완료: 접수 번호, 수정·철회 안내, 유사 습득물 추천(GET /lost-reports/{id}/matches)
 */
export default function ReportLostCompletePage() {
  const { id } = useParams();
  const location = useLocation();
  const headingRef = useRef(null);
  const [report, setReport] = useState(location.state?.report || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // 새로 고침으로 state가 없어졌으면 다시 불러온다
  useEffect(() => {
    if (report) return undefined;
    let cancelled = false;
    getLostReport(id)
      .then((data) => !cancelled && setReport(data))
      .catch((err) => !cancelled && setError(toUserError(err, '신고 정보를 불러오지 못했습니다.').message));
    return () => {
      cancelled = true;
    };
  }, [id, report]);

  const receiptNo = report?.receiptNo || `LR-${String(id).padStart(6, '0')}`;
  const searchQuery = report
    ? new URLSearchParams({ categoryId: String(report.categoryId), startDate: report.lostDate }).toString()
    : '';

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="space-y-3 text-center" role="status">
        <CheckCircle size={56} className="mx-auto text-success" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-text focus:outline-none">
          분실 신고가 접수되었습니다
        </h1>
        <p className="text-sub">마이페이지에서 수정·철회할 수 있습니다.</p>
      </div>

      <Card className="space-y-1 border-l-4 border-primary bg-blue-50 text-center">
        <p className="text-sm text-primary">접수 번호</p>
        <p className="text-3xl font-bold tracking-wide text-primary">{receiptNo}</p>
        {report && (
          <>
            <p className="text-text">{report.title}</p>
            <p className="text-sm text-sub">
              {formatLostPeriod(report.lostDate, report.lostEndDate, formatDate)} · {describeLostLocation(report)}
            </p>
          </>
        )}
      </Card>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <Card className="space-y-3">
        <h2 className="font-bold text-text">비슷한 습득물이 있는지 확인해 보세요</h2>
        <MatchList reportId={id} searchQuery={searchQuery} />
      </Card>

      <div className="flex flex-col gap-3">
        <Link
          to="/mypage?tab=lost"
          className="inline-flex min-h-[44px] items-center justify-center rounded bg-primary px-4 font-medium text-white hover:bg-blue-900"
        >
          내 분실 신고 보기
        </Link>
        <Link
          to={`/lost-reports/${id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded border-2 border-primary px-4 font-medium text-primary hover:bg-blue-50"
        >
          접수한 신고 보기
        </Link>
        <Link to="/" className="inline-flex min-h-[44px] items-center justify-center rounded px-4 font-medium text-primary hover:underline">
          홈으로
        </Link>
      </div>
    </div>
  );
}
