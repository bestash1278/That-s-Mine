import { statusLabels, statusColors } from '../../constants/status';

export default function StatusBadge({ status, label }) {
  const displayLabel = label || statusLabels[status] || status;
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {displayLabel}
    </span>
  );
}
