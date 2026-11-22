import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import Card from '../components/common/Card.jsx';
import LostReportForm from '../components/lost-report/LostReportForm.jsx';
import { createLostReport } from '../api/lostReports.js';
import { toUserError } from '../api/client.js';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { splitPhotos } from '../utils/editPhotos.js';
import { buildLostReportRequest, draftFromQuery } from '../utils/lostReportForm.js';

/**
 * 분실 신고 작성 (SPEC §11)
 * 분실물 조회에서 결과가 없을 때 넘어오면 검색 조건(검색어·종류·날짜)을 미리 채운다.
 */
export default function ReportLostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error: refError, categories, buildings } = useReferenceData();
  // 처음 들어올 때의 쿼리로 한 번만 만든다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialDraft = useMemo(() => draftFromQuery(searchParams), []);
  const prefilled = Boolean(initialDraft.title || initialDraft.categoryId || initialDraft.lostDate);

  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [serverMessage, setServerMessage] = useState('');

  const handleSubmit = async (draft) => {
    setSubmitting(true);
    setServerMessage('');
    const { files, representativeImageIndex } = splitPhotos(draft.photos, draft.representativePhotoId);
    try {
      const report = await createLostReport(
        { ...buildLostReportRequest(draft), representativeImageIndex: representativeImageIndex ?? 0 },
        files,
      );
      navigate(`/report-lost/complete/${report.reportId}`, { replace: true, state: { report } });
    } catch (err) {
      const e = toUserError(err, '분실 신고를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setServerErrors(e.fieldErrors);
      setServerMessage(Object.keys(e.fieldErrors).length ? '' : e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">분실 신고</h1>
        <p className="mt-1 text-sm text-sub">
          잃어버린 물건을 등록해 두면 비슷한 습득물을 확인할 수 있어요. <span className="text-red-700">*</span> 표시는 꼭 입력해야 하는 항목이에요.
        </p>
      </div>
      <LostReportForm
        initialDraft={initialDraft}
        categories={categories}
        buildings={buildings}
        referenceLoading={loading}
        referenceError={refError}
        serverErrors={serverErrors}
        serverMessage={serverMessage}
        submitting={submitting}
        submitLabel="분실 신고 접수"
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        notice={
          prefilled && (
            <Card className="flex gap-2 border-l-4 border-primary bg-blue-50 text-sm text-primary">
              <Search size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p>조회할 때 입력한 검색 조건을 미리 채웠어요. 맞지 않는 내용은 고쳐 주세요.</p>
            </Card>
          )
        }
      />
    </div>
  );
}
