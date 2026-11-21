import Button from './Button';

export default function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-lg text-sub font-medium mb-4">{message || '결과가 없습니다.'}</p>
      {onAction && actionLabel && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
