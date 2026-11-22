import { MapPin, Trash2 } from 'lucide-react';
import Button from '../common/Button.jsx';
import { nearestBuilding } from '../../utils/mapMarkers.js';

/** 지도에서 고른 위치 요약 + 변경·지우기 */
export default function PickedLocation({ lat, lng, buildings, onChange, onClear, emptyLabel, emptyHelp }) {
  if (lat == null || lng == null) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" onClick={onChange} className="w-full sm:w-auto">
          <MapPin size={18} className="mr-2" aria-hidden="true" /> {emptyLabel}
        </Button>
        {emptyHelp && <p className="text-sm text-sub">{emptyHelp}</p>}
      </div>
    );
  }
  const near = nearestBuilding({ lat, lng }, buildings);
  const nearText = near && near.distance <= 120 ? `${near.building.buildingName} 근처` : '지도에서 고른 지점';
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-blue-200 bg-blue-50 p-3">
      <MapPin size={18} className="text-error" aria-hidden="true" />
      <p className="flex-1 text-sm text-text">
        <span className="font-medium">지도 위치 지정됨</span> · {nearText}
      </p>
      <button type="button" onClick={onChange} className="min-h-[44px] px-2 text-sm font-medium text-primary underline">
        위치 변경
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="지도 위치 지우기"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-error"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
