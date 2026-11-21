import { X } from 'lucide-react';

export default function FilterChip({ label, onRemove }) {
  return (
    <div className="inline-flex items-center gap-2 bg-primary text-white px-3 py-1 rounded-full text-sm">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity"
        aria-label="필터 제거"
      >
        <X size={16} />
      </button>
    </div>
  );
}
