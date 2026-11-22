import { Link } from 'react-router-dom';
import { Archive, ImageOff, MapPin, X } from 'lucide-react';
import StatusBadge from '../common/StatusBadge.jsx';
import { MARKER_TYPES } from '../../constants/map.js';
import { formatDate } from '../../utils/dateUtils.js';
import { formatLostPeriod } from '../../utils/lostReportForm.js';
import { MarkerSwatch } from './ItemMarker.jsx';

/**
 * 마커를 눌렀을 때 보여주는 물품 카드. 같은 지점에 물품이 여러 개면 목록으로 보여준다.
 * 지도 위 말풍선 대신 지도 아래(모바일)·지도 위 모서리(PC)에 카드로 띄운다(키보드·스크린리더 접근 가능).
 */
export default function MapItemPopup({ group, onClose, linkState, className = '' }) {
  if (!group) return null;
  const type = MARKER_TYPES[group.type];
  const multiple = group.items.length > 1;

  return (
    <section
      aria-label={`${type.label} ${group.type === 'LOST' ? '신고' : '물품'} 정보`}
      className={`rounded-lg border border-gray-200 bg-white shadow-lg ${className}`}
    >
      <header className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MarkerSwatch type={group.type} />
          <div>
            <p className="text-xs text-sub">{type.label}</p>
            <p className="font-medium text-text">
              {group.label || '위치'}
              {multiple && <span className="ml-1 text-sm text-sub">· {group.items.length}건</span>}
            </p>
            {group.approximate && <p className="text-xs text-sub">정확한 지점이 아닌 건물 위치 기준이에요.</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="물품 정보 닫기"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sub hover:text-text"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      {group.type === 'LOST' ? (
        <ul className={`divide-y divide-gray-100 ${multiple ? 'max-h-72 overflow-y-auto' : ''}`}>
          {group.items.map((report) => (
            <li key={report.reportId} className="flex gap-3 p-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {report.thumbnailUrl ? (
                  <img src={report.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sub">
                    <ImageOff size={20} aria-hidden="true" />
                    <span className="sr-only">사진 없음</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium text-text">{report.title}</p>
                <p className="text-sm text-sub">
                  <span className="sr-only">잃어버린 때:</span>
                  {formatLostPeriod(report.lostDate, report.lostEndDate, formatDate)}
                </p>
                {report.lostLocationDetail && <p className="truncate text-sm text-sub">{report.lostLocationDetail}</p>}
              </div>
              <Link
                to={`/lost-reports/${report.reportId}`}
                state={linkState}
                className="inline-flex min-h-[44px] flex-shrink-0 items-center self-center rounded border-2 border-orange-600 px-3 text-sm font-medium text-orange-800 hover:bg-orange-50"
                aria-label={`${report.title} 분실 신고 보기`}
              >
                신고 보기
              </Link>
            </li>
          ))}
        </ul>
      ) : (
      <ul className={`divide-y divide-gray-100 ${multiple ? 'max-h-72 overflow-y-auto' : ''}`}>
        {group.items.map((item) => {
          const thumb = item.imageUrls?.[0];
          return (
            <li key={item.itemId} className="flex gap-3 p-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sub">
                    <ImageOff size={20} aria-hidden="true" />
                    <span className="sr-only">사진 없음</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-text">{item.title}</p>
                  <StatusBadge status={item.status} label={item.statusLabel} />
                </div>
                <p className="flex items-center gap-1 text-sm text-sub">
                  <MapPin size={14} className="flex-shrink-0 text-error" aria-hidden="true" />
                  <span className="sr-only">발견:</span>
                  {formatDate(item.foundDate)} · {item.foundBuildingName || item.foundLocation}
                </p>
                <p className="flex items-center gap-1 text-sm text-sub">
                  <Archive size={14} className="flex-shrink-0 text-primary" aria-hidden="true" />
                  <span className="sr-only">보관:</span>
                  {item.storageStatusLabel}
                </p>
              </div>
              <Link
                to={`/items/${item.itemId}`}
                state={linkState}
                className="inline-flex min-h-[44px] flex-shrink-0 items-center self-center rounded border-2 border-primary px-3 text-sm font-medium text-primary hover:bg-blue-50"
                aria-label={`${item.title} 상세 보기`}
              >
                상세 보기
              </Link>
            </li>
          );
        })}
      </ul>
      )}
    </section>
  );
}
