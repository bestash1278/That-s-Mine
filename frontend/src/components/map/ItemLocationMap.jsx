import { useMemo } from 'react';
import Card from '../common/Card.jsx';
import CampusMap from './CampusMap.jsx';
import { MarkerSwatch } from './ItemMarker.jsx';
import { useKakaoLoader } from '../../hooks/useKakaoLoader.js';
import { getFoundPosition, getStoragePosition } from '../../utils/mapMarkers.js';

/**
 * 상세 화면의 위치 지도: 빨간 핀 = 발견한 곳, 파란 핀 = 지금 보관 중인 곳.
 * 지도를 쓸 수 없거나 좌표가 없으면 아무것도 그리지 않는다(위의 글 정보로 충분).
 */
export default function ItemLocationMap({ item }) {
  const { status, kakao } = useKakaoLoader();
  const { found, storage, groups } = useMemo(() => {
    const f = getFoundPosition(item);
    const st = item.status === 'RETURNED' ? null : getStoragePosition(item);
    const list = [];
    if (f) list.push({ key: 'found', type: 'FOUND', lat: f.lat, lng: f.lng, label: '발견한 곳', items: [item] });
    if (st) list.push({ key: 'storage', type: 'STORAGE', lat: st.lat, lng: st.lng, label: '보관 중인 곳', items: [item] });
    return { found: f, storage: st, groups: list };
  }, [item]);

  if (status !== 'ready' || !kakao || groups.length === 0) return null;

  const center = storage && found
    ? { lat: (found.lat + storage.lat) / 2, lng: (found.lng + storage.lng) / 2 }
    : found || storage;

  return (
    <Card className="space-y-2">
      <h3 className="font-bold text-text">위치 지도</h3>
      <ul className="flex flex-wrap gap-4 text-sm text-text" aria-label="지도 범례">
        {found && (
          <li className="flex items-center gap-1">
            <MarkerSwatch type="FOUND" /> 발견한 곳{found.approximate ? ' (건물 위치 기준)' : ''}
          </li>
        )}
        {storage && (
          <li className="flex items-center gap-1">
            <MarkerSwatch type="STORAGE" /> 지금 보관 중인 곳
          </li>
        )}
      </ul>
      <div className="h-56 overflow-hidden rounded border border-gray-200 md:h-72">
        <CampusMap
          kakao={kakao}
          center={center}
          level={storage && found ? 4 : 3}
          groups={groups}
          cluster={false}
          ariaLabel="발견 위치와 보관 위치 지도"
        />
      </div>
    </Card>
  );
}
