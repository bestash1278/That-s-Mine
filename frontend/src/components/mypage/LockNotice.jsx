import { Lock } from 'lucide-react';

/** 수정·삭제를 할 수 없는 이유 (버튼을 숨기지 않고 비활성 + 이유 표시) */
export default function LockNotice({ id, reason }) {
  if (!reason) return null;
  return (
    <p id={id} className="flex gap-2 rounded bg-gray-50 p-2 text-sm text-sub">
      <Lock size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> {reason}
    </p>
  );
}
