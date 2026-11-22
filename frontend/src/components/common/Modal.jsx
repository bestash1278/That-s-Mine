import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/** 확인 대화상자. Esc로 닫히고, 열리면 대화상자로 포커스가 옮겨지며, 닫히면 원래 위치로 돌아간다. */
export default function Modal({ isOpen, title, children, onClose }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  // onClose가 렌더마다 새 함수여도 포커스가 다시 옮겨지지 않게 ref로 보관
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="mx-4 w-full max-w-md rounded-lg bg-card shadow-lg focus:outline-none"
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 id={titleId} className="text-lg font-medium text-text">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sub transition-colors hover:text-text"
              aria-label="닫기"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
