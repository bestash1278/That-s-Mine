import { Link } from 'react-router-dom';
import { Archive, ImageOff, MapPin } from 'lucide-react';
import Card from './Card';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../utils/dateUtils.js';

/**
 * 물품 카드. 정보 순서 고정: 사진 → 물품명 → 카테고리 → 발견 → 상태 → 보관
 * @param linkState 상세에서 "목록으로" 돌아올 주소 등 (Link state)
 * @param highlighted 지도에서 선택된 물품 강조
 */
export default function ItemCard({ item, linkState, highlighted = false, onFocusItem }) {
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
    storageStatusLabel,
  } = item;
  const thumb = firstImageUrl || item.imageUrls?.[0];

  return (
    <Link
      to={`/items/${itemId}`}
      state={linkState}
      onFocus={onFocusItem ? () => onFocusItem(itemId) : undefined}
      className="block h-full rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <Card
        className={`h-full cursor-pointer transition-shadow hover:shadow-lg ${highlighted ? 'ring-2 ring-accent' : ''}`}
      >
        <div className="space-y-3">
          <div className="h-28 w-full overflow-hidden sm:h-40 rounded bg-gray-100">
            {thumb ? (
              <img src={thumb} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-600">
                <ImageOff size={24} aria-hidden="true" />
                <span className="text-xs">사진 없음</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="line-clamp-2 text-lg font-bold text-text">{title}</h3>
            <p className="text-sm text-sub">{categoryName}</p>
          </div>

          <p className="flex items-start gap-1 text-sm text-text">
            <MapPin size={16} className="mt-0.5 flex-shrink-0 text-error" aria-hidden="true" />
            <span>
              <span className="font-medium">발견</span> {formatDate(foundDate)} · {foundBuildingName || foundLocation}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} label={statusLabel} />
          </div>

          <p className="flex items-start gap-1 rounded bg-blue-50 p-2 text-sm text-text">
            <Archive size={16} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-medium">보관</span> {storageStatusLabel || '보관 장소 확인 중'}
            </span>
          </p>
        </div>
      </Card>
    </Link>
  );
}
