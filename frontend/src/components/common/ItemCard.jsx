import { Link } from 'react-router-dom';
import Card from './Card';
import StatusBadge from './StatusBadge';

export default function ItemCard({ item }) {
  const {
    itemId,
    title,
    categoryName,
    foundDate,
    foundLocation,
    foundBuildingName,
    status,
    statusLabel,
    firstImageUrl,
    storageName,
    storageStatusLabel,
  } = item;

  return (
    <Link to={`/items/${itemId}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="space-y-3">
          {/* 사진 */}
          {firstImageUrl && (
            <div className="w-full h-48 bg-gray-200 rounded overflow-hidden">
              <img
                src={firstImageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* 물품명 */}
          <h3 className="text-lg font-bold text-text line-clamp-2">{title}</h3>

          {/* 카테고리 */}
          <p className="text-sm text-sub">{categoryName}</p>

          {/* 발견: 날짜 · 장소 */}
          <div className="text-sm text-text space-y-1">
            <p>
              <span className="font-medium">발견:</span> {foundDate} · {foundLocation}
            </p>
            {foundBuildingName && (
              <p className="text-sub text-xs">건물: {foundBuildingName}</p>
            )}
          </div>

          {/* 상태 배지 */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} label={statusLabel} />
          </div>

          {/* 보관: 장소명 또는 보관 장소 확인 중 */}
          <div className="bg-blue-50 p-2 rounded text-sm text-text">
            {storageName ? (
              <p>
                <span className="font-medium">보관:</span> {storageName}
              </p>
            ) : (
              <p className="text-sub">보관 장소 확인 중...</p>
            )}
            {storageStatusLabel && (
              <p className="text-xs text-sub">{storageStatusLabel}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
