import Button from './Button.jsx';
import Modal from './Modal.jsx';

/**
 * 되돌리기 어려운 작업(삭제 등) 전에 묻는 대화상자.
 * 기본 포커스는 대화상자 자체에 두어 Enter 한 번으로 실수로 삭제되지 않게 한다.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  busy = false,
  error,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={busy ? undefined : onCancel}>
      <div className="space-y-4">
        {typeof message === 'string' ? <p className="text-text">{message}</p> : message}
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 ${danger ? '!bg-error hover:!bg-red-800' : ''}`}
          >
            {busy ? '처리 중…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
