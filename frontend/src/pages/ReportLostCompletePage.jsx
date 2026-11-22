import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle, Info } from 'lucide-react';
import Card from '../components/common/Card.jsx';
import ItemCard from '../components/common/ItemCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { getLostReport } from '../api/lostReports.js';
import { searchFoundItems } from '../api/foundItems.js';
import { toUserError } from '../api/client.js';
import { formatDate } from '../utils/dateUtils.js';
import { describeLostLocation, formatLostPeriod } from '../utils/lostReportForm.js';

const PREVIEW_SIZE = 3;

/**
 * 분실 신고 완료: 접수 번호, 수정·철회 안내, 바로 볼 수 있는 습득물 미리보기
 * 미리보기는 지금은 '같은 종류 + 분실 시작일 이후 발견'으로 고른다.
 * 점수 기반 유사 물품 추천(GET /lost-reports/{id}/matches)은 11단계에서 이 자리에 연결한다.
 */
export default function ReportLostCompletePage() {
  const { id } = useParams();
  const location = useLocation();
  const headingRef = useRef(null);
  const [report, setReport] = useState(location.state?.report || null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState({ loading: true, items: [], total: 0 });

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

  useEffect(() => {
    if (!report) return undefined;
    let cancelled = false;
    searchFoundItems({ categoryId: report.categoryId, startDate: report.lostDate, size: PREVIEW_SIZE })
      .then((page) => !cancelled && setPreview({ loading: false, items: page?.content || [], total: page?.totalElements || 0 }))
      .catch(() => !cancelled && setPreview({ loading: false, items: [], total: 0 }));
    return () => {
      cancelled = true;
    };
  }, [report]);

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
        <h2 className="font-bold text-text">지금 바로 확인해 보세요</h2>
        <p className="flex gap-2 rounded bg-amber-50 p-3 text-sm text-amber-900">
          <Info size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          같은 종류이면서 잃어버린 날 이후에 발견된 습득물이에요. 내 물건이라는 뜻은 아니니 사진과 특징을 꼭 확인해 주세요.
        </p>
        {preview.loading ? (
          <LoadingState />
        ) : preview.items.length === 0 ? (
          <p className="text-sm text-sub">아직 비슷한 습득물이 없어요. 새로 등록되면 분실물 조회에서 확인할 수 있어요.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {preview.items.map((item) => (
              <ItemCard key={item.itemId} item={item} />
            ))}
          </div>
        )}
        {searchQuery && (
          <Link to={`/items?${searchQuery}`} className="inline-flex min-h-[44px] items-center font-medium text-primary underline">
            {preview.total > PREVIEW_SIZE ? `조건에 맞는 습득물 ${preview.total}건 모두 보기` : '분실물 조회에서 더 찾아보기'}
          </Link>
        )}
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
