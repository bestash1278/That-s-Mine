import { useEffect, useRef, useState } from 'react';
import { CAMPUS_CENTER, DEFAULT_MAP_LEVEL, MARKER_TYPES } from '../../constants/map.js';
import { createItemMarker } from './ItemMarker.jsx';

/**
 * 캠퍼스 지도 (Kakao Maps). kakao가 준비된 뒤에만 그린다.
 *
 * - groups: buildMarkerGroups() 결과. 같은 지점의 물품은 마커 하나로 묶여 개수가 표시된다
 * - 가까운 마커는 확대 수준에 따라 클러스터로 묶인다(클러스터를 누르면 확대)
 * - 이벤트 리스너는 지도를 만들 때 한 번만 등록하고, 콜백은 ref로 최신 값을 쓴다
 * - 컴포넌트가 사라지면 리스너·마커·클러스터를 모두 정리한다
 *
 * @param focus { lat, lng, level?, token } token이 바뀔 때마다 그 위치로 이동
 * @param pin { lat, lng } 위치 선택용 핀(드래그 가능). onPinMove로 새 위치를 알린다
 */
export default function CampusMap({
  kakao,
  center = CAMPUS_CENTER,
  level = DEFAULT_MAP_LEVEL,
  groups = [],
  selectedKey = null,
  onGroupClick,
  onIdle,
  onClick,
  focus,
  pin,
  onPinMove,
  cluster = true,
  ariaLabel = '캠퍼스 지도',
  className = '',
}) {
  const containerRef = useRef(null);
  const clustererRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const [map, setMap] = useState(null);

  // 최신 콜백을 ref에 보관 → 리스너를 다시 등록하지 않아도 됨
  const handlers = useRef({ onGroupClick, onIdle, onClick, onPinMove });
  useEffect(() => {
    handlers.current = { onGroupClick, onIdle, onClick, onPinMove };
  }, [onGroupClick, onIdle, onClick, onPinMove]);

  // 지도 생성 (한 번)
  useEffect(() => {
    if (!kakao || !containerRef.current) return undefined;
    const { maps } = kakao;
    const instance = new maps.Map(containerRef.current, {
      center: new maps.LatLng(center.lat, center.lng),
      level,
    });
    instance.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);

    if (cluster && maps.MarkerClusterer) {
      clustererRef.current = new maps.MarkerClusterer({
        map: instance,
        averageCenter: true,
        minLevel: 5, // 많이 축소했을 때만 묶는다
        minClusterSize: 2,
      });
    }

    const handleIdle = () => {
      const bounds = instance.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      handlers.current.onIdle?.(
        { minLat: sw.getLat(), maxLat: ne.getLat(), minLng: sw.getLng(), maxLng: ne.getLng() },
        instance.getLevel(),
      );
    };
    const handleClick = (mouseEvent) => {
      handlers.current.onClick?.({ lat: mouseEvent.latLng.getLat(), lng: mouseEvent.latLng.getLng() });
    };
    maps.event.addListener(instance, 'idle', handleIdle);
    maps.event.addListener(instance, 'click', handleClick);

    // 화면 크기·레이아웃이 바뀌면 지도 크기를 다시 계산
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => instance.relayout()) : null;
    observer?.observe(containerRef.current);

    setMap(instance);
    return () => {
      observer?.disconnect();
      maps.event.removeListener(instance, 'idle', handleIdle);
      maps.event.removeListener(instance, 'click', handleClick);
      clustererRef.current?.clear();
      clustererRef.current = null;
      pinMarkerRef.current?.setMap(null);
      pinMarkerRef.current = null;
      setMap(null);
    };
    // center·level은 처음 위치로만 쓴다. 이후 이동은 focus로 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakao]);

  // 물품 마커 (groups·선택 상태가 바뀌면 다시 그림)
  useEffect(() => {
    if (!map || !kakao) return undefined;
    const { maps } = kakao;
    const created = [];
    groups.forEach((group) => {
      const selected = group.key === selectedKey;
      const marker = createItemMarker(kakao, {
        type: group.type,
        lat: group.lat,
        lng: group.lng,
        selected,
        count: group.items.length,
        title: `${MARKER_TYPES[group.type]?.label}: ${group.label} (${group.items.length}건)`,
      });
      const handle = () => handlers.current.onGroupClick?.(group);
      maps.event.addListener(marker, 'click', handle);
      created.push({ marker, handle, selected });
    });

    // 선택된 마커는 클러스터에 넣지 않고 항상 보이게 한다
    const clusterer = clustererRef.current;
    if (clusterer) {
      clusterer.addMarkers(created.filter((c) => !c.selected).map((c) => c.marker));
      created.filter((c) => c.selected).forEach((c) => c.marker.setMap(map));
    } else {
      created.forEach((c) => c.marker.setMap(map));
    }

    return () => {
      created.forEach(({ marker, handle }) => {
        maps.event.removeListener(marker, 'click', handle);
        marker.setMap(null);
      });
      clusterer?.clear();
    };
  }, [map, kakao, groups, selectedKey]);

  // 위치 선택 핀 (드래그로 수정)
  useEffect(() => {
    if (!map || !kakao) return undefined;
    const { maps } = kakao;
    if (!pin) {
      pinMarkerRef.current?.setMap(null);
      pinMarkerRef.current = null;
      return undefined;
    }
    let marker = pinMarkerRef.current;
    if (!marker) {
      marker = createItemMarker(kakao, { type: 'FOUND', lat: pin.lat, lng: pin.lng, selected: true, title: '선택한 위치', draggable: true });
      marker.setMap(map);
      pinMarkerRef.current = marker;
    } else {
      marker.setPosition(new maps.LatLng(pin.lat, pin.lng));
    }
    const handleDragEnd = () => {
      const p = marker.getPosition();
      handlers.current.onPinMove?.({ lat: p.getLat(), lng: p.getLng() });
    };
    maps.event.addListener(marker, 'dragend', handleDragEnd);
    return () => maps.event.removeListener(marker, 'dragend', handleDragEnd);
  }, [map, kakao, pin]);

  // 외부 요청으로 위치 이동
  useEffect(() => {
    if (!map || !kakao || !focus) return;
    if (focus.level) map.setLevel(focus.level);
    map.panTo(new kakao.maps.LatLng(focus.lat, focus.lng));
    // token이 바뀔 때만 이동
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, kakao, focus?.token]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className={`h-full w-full bg-gray-100 ${className}`}
    />
  );
}
