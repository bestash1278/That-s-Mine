import { MARKER_TYPES, MARKER_TYPE_ORDER } from '../../constants/map.js';
import { MarkerSwatch } from './ItemMarker.jsx';

/**
 * 마커 범례 + 표시할 위치 종류 선택 (체크박스)
 * @param disabledTypes { [type]: '이유' } 아직 쓸 수 없는 종류
 */
export default function MapLegend({ visibleTypes, onChange, disabledTypes = {}, compact = false }) {
  const toggle = (type) => {
    if (visibleTypes.includes(type)) onChange(visibleTypes.filter((t) => t !== type));
    else onChange([...visibleTypes, type]);
  };

  return (
    <fieldset className="rounded-lg border border-gray-200 bg-white p-3">
      <legend className="px-1 text-sm font-medium text-text">지도에 표시할 위치</legend>
      <ul className={compact ? 'flex flex-wrap gap-x-4 gap-y-1' : 'space-y-1'}>
        {MARKER_TYPE_ORDER.map((type) => {
          const disabledReason = disabledTypes[type];
          const id = `legend-${type}`;
          return (
            <li key={type}>
              <label
                htmlFor={id}
                className={`flex min-h-[36px] items-center gap-2 text-sm ${disabledReason ? 'cursor-not-allowed text-sub' : 'cursor-pointer text-text'}`}
                title={disabledReason || undefined}
              >
                <input
                  id={id}
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={!disabledReason && visibleTypes.includes(type)}
                  disabled={Boolean(disabledReason)}
                  onChange={() => toggle(type)}
                  aria-describedby={disabledReason ? `${id}-reason` : undefined}
                />
                <MarkerSwatch type={type} />
                <span>{MARKER_TYPES[type].label}</span>
              </label>
              {disabledReason && !compact && (
                <p id={`${id}-reason`} className="pl-12 text-xs text-sub">
                  {disabledReason}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
