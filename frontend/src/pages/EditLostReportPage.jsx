import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Card from '../components/common/Card.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import LostReportForm from '../components/lost-report/LostReportForm.jsx';
import { getLostReport, updateLostReport } from '../api/lostReports.js';
import { toUserError } from '../api/client.js';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { photosFromUrls, splitPhotos } from '../utils/editPhotos.js';
import { buildLostReportRequest, draftFromReport } from '../utils/lostReportForm.js';

/** 내 분실 신고 수정 ('찾는 중'일 때만. 실제 허용 여부는 서버가 다시 판단) */
export default function EditLostReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading: refLoading, error: refError, categories, buildings } = useReferenceData();
  const [state, setState] = useState({ loading: true, error: null, report: null, draft: null });
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');

  const load = useCallback(async () => {
    setState({ loading: true, error: null, report: null, draft: null });
    try {
      const report = await getLostReport(id);
      const draft = { ...draftFromReport(report), photos: photosFromUrls(report.imageUrls) };
      draft.representativePhotoId = draft.photos[0]?.id ?? null;
      setState({ loading: false, error: null, report, draft });
    } catch (err) {
      setState({ loading: false, error: toUserError(err, '신고 정보를 불러오지 못했습니다.'), report: null, draft: null });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (draft) => {
    setSubmitting(true);
    setServerMessage('');
    const photos = splitPhotos(draft.photos, draft.representativePhotoId);
    try {
      await updateLostReport(
        id,
        {
          ...buildLostReportRequest(draft),
          keepImageUrls: photos.keepImageUrls,
          representativeImageUrl: photos.representativeImageUrl,
          representativeImageIndex: photos.representativeImageIndex,
        },
        photos.files,
      );
      navigate(`/lost-reports/${id}`, { replace: true });
    } catch (err) {
      const e = toUserError(err, '수정하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setServerErrors(e.fieldErrors);
      setServerMessage(Object.keys(e.fieldErrors).length ? '' : e.message);
      setSubmitting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error.message} onRetry={load} />;

  const { report } = state;
  if (!report.mine || !report.contentEditable) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-text">분실 신고 수정</h1>
        <Card className="flex gap-2 text-text">
          <Lock size={18} className="mt-0.5 flex-shrink-0 text-sub" aria-hidden="true" />
          <p>{report.mine ? report.lockReason : '본인이 등록한 분실 신고만 수정할 수 있어요.'}</p>
        </Card>
        <Link to={`/lost-reports/${id}`} className="inline-flex min-h-[44px] items-center font-medium text-primary underline">
          신고 보기로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">분실 신고 수정</h1>
        <p className="mt-1 text-sm text-sub">접수 번호 {report.receiptNo}</p>
      </div>
      <LostReportForm
        initialDraft={state.draft}
        categories={categories}
        buildings={buildings}
        referenceLoading={refLoading}
        referenceError={refError}
        serverErrors={serverErrors}
        serverMessage={serverMessage}
        submitting={submitting}
        submitLabel="수정 내용 저장"
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
