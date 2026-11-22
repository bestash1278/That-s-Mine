import { X } from 'lucide-react';

export default function FilterChip({ label, onRemove }) {
  return (
    <div className="inline-flex items-center gap-1 bg-primary text-white pl-3 pr-3 py-1 rounded-full text-sm">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="-my-3 -mr-3 inline-flex h-11 w-11 items-center justify-center hover:opacity-70 transition-opacity"
        aria-label={`${label} 조건 지우기`}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
