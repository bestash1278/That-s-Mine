import { useState } from 'react';
import { CheckCircle, RotateCcw, XCircle } from 'lucide-react';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { changeLostReportStatus } from '../../api/lostReports.js';
import { toUserError } from '../../api/client.js';
import { LostReportStatus } from '../../constants/status.js';

const ACTIONS = {
  [LostReportStatus.FOUND]: {
    label: '찾았어요',
    icon: CheckCircle,
    title: "'찾기 완료'로 바꿀까요?",
    message: '찾은 물건으로 표시되고 지도에서 빠집니다. 내용 수정은 막히지만, 필요하면 다시 \'찾는 중\'으로 바꿀 수 있어요.',
  },
  [LostReportStatus.CLOSED]: {
    label: '신고 종료',
    icon: XCircle,
    title: '신고를 종료할까요?',
    message: '더 이상 찾지 않는 신고로 표시되고 지도에서 빠집니다. 필요하면 다시 \'찾는 중\'으로 바꿀 수 있어요.',
  },
  [LostReportStatus.SEARCHING]: {
    label: "다시 '찾는 중'으로",
    icon: RotateCcw,
    title: "다시 '찾는 중'으로 바꿀까요?",
    message: '지도와 목록에 다시 나타나고, 내용을 수정할 수 있어요.',
  },
};

/**
 * 분실 신고 상태 바꾸기(본인). 찾는 중이면 '찾았어요'·'신고 종료', 그 밖에는 '다시 찾는 중으로'.
 * @param onChanged (갱신된 LostReportDTO) => void
 */
export default function LostReportStatusActions({ report, onChanged, compact = false }) {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const options =
    report.status === LostReportStatus.SEARCHING
      ? [LostReportStatus.FOUND, LostReportStatus.CLOSED]
      : [LostReportStatus.SEARCHING];

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await changeLostReportStatus(report.reportId, target);
      setTarget(null);
      onChanged?.(updated);
    } catch (err) {
      setError(toUserError(err, '상태를 바꾸지 못했습니다.').message);
    } finally {
      setBusy(false);
    }
  };

  const action = target ? ACTIONS[target] : null;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : ''}`}>
        {options.map((status) => {
          const { label, icon: Icon } = ACTIONS[status];
          return (
            <Button key={status} type="button" variant="secondary" size="sm" onClick={() => setTarget(status)}>
              <Icon size={16} className="mr-1" aria-hidden="true" /> {label}
            </Button>
          );
        })}
      </div>
      <ConfirmDialog
        isOpen={Boolean(target)}
        title={action?.title}
        message={action?.message}
        confirmLabel="바꾸기"
        busy={busy}
        error={error}
        onConfirm={confirm}
        onCancel={() => {
          setTarget(null);
          setError(null);
        }}
      />
    </>
  );
}
