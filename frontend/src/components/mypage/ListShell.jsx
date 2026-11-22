import Button from '../common/Button.jsx';
import ErrorState from '../common/ErrorState.jsx';
import LoadingState from '../common/LoadingState.jsx';

/** 마이페이지 목록 공통 틀: 불러오는 중 / 오류 / 비어 있음 / 목록 + 더 보기 */
export default function ListShell({ list, emptyMessage, emptyAction, children }) {
  if (list.loading && list.items.length === 0) return <LoadingState />;
  if (list.error && list.items.length === 0) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (list.items.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
        <p className="text-sub">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-sub">총 {list.totalElements}건</p>
      <ul className="space-y-3">{children}</ul>
      {list.error && (
        <p role="alert" className="text-sm text-error">
          {list.error}
        </p>
      )}
      {list.hasMore && (
        <Button variant="outline" onClick={list.loadMore} disabled={list.loading} className="w-full">
          {list.loading ? '불러오는 중…' : '더 보기'}
        </Button>
      )}
    </div>
  );
}
