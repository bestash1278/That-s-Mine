import { MARKER_TYPES, markerImage } from '../../constants/map.js';

/**
 * Kakao 지도 마커를 만든다. (지도 위 마커는 DOM이 아니라 SDK 객체라서 함수로 만든다)
 * @returns kakao.maps.Marker
 */
export function createItemMarker(kakao, { type, lat, lng, selected = false, count = 1, title, draggable = false }) {
  const image = markerImage(type, selected, count);
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
    image: new kakao.maps.MarkerImage(image.src, new kakao.maps.Size(image.width, image.height), {
      offset: new kakao.maps.Point(image.width / 2, image.height),
    }),
    title,
    clickable: true,
    draggable,
    zIndex: selected ? 10 : 1,
  });
  return marker;
}

/** 범례·목록에서 쓰는 마커 견본 (색 + 글자) */
export function MarkerSwatch({ type, className = '' }) {
  const t = MARKER_TYPES[type] || MARKER_TYPES.FOUND;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${className}`}
      style={{ backgroundColor: t.color }}
    >
      {t.letter}
    </span>
  );
}

export default MarkerSwatch;
