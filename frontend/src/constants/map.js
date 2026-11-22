// 지도 설정. 학교의 실제 좌표가 정해지지 않았으므로 환경변수로 바꿀 수 있게 하고,
// 기본값은 시드 데이터(시연용 건물)와 같은 시연용 좌표를 쓴다. 실제 캠퍼스 좌표가 아니다.
const env = import.meta.env || {};

const toNumber = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

// 예시 값(your-...)을 그대로 두었으면 키가 없는 것으로 본다
const rawKey = (env.VITE_KAKAO_MAP_KEY || '').trim();
export const KAKAO_MAP_KEY = /^your[-_]/i.test(rawKey) ? '' : rawKey;

export const CAMPUS_CENTER = {
  lat: toNumber(env.VITE_CAMPUS_CENTER_LAT, 37.4979),
  lng: toNumber(env.VITE_CAMPUS_CENTER_LNG, 126.9572),
};

/** 카카오맵 확대 수준(숫자가 작을수록 확대). 3 ≈ 캠퍼스 한 구역 */
export const DEFAULT_MAP_LEVEL = toNumber(env.VITE_CAMPUS_MAP_LEVEL, 3);

/**
 * 마커 종류 (SPEC §9). 색만으로 구분하지 않도록 글자(letter)를 함께 넣는다.
 */
export const MARKER_TYPES = {
  FOUND: { key: 'FOUND', label: '습득물 발견 위치', color: '#DC2626', letter: '발' },
  STORAGE: { key: 'STORAGE', label: '물품 보관 위치', color: '#2563EB', letter: '보' },
  LOST: { key: 'LOST', label: '분실 신고 위치', color: '#EA580C', letter: '분' },
  RETURNED: { key: 'RETURNED', label: '반환 완료 물품', color: '#6B7280', letter: '완' },
};

export const MARKER_TYPE_ORDER = ['FOUND', 'STORAGE', 'LOST', 'RETURNED'];

/** 처음 보여줄 마커 종류 */
export const DEFAULT_VISIBLE_TYPES = ['FOUND', 'STORAGE'];

/**
 * 핀 모양 마커 SVG (data URI). 선택된 마커는 더 크고 테두리가 두껍다.
 * @returns {{ src: string, width: number, height: number }}
 */
export function markerImage(typeKey, selected = false, count = 1) {
  const type = MARKER_TYPES[typeKey] || MARKER_TYPES.FOUND;
  const w = selected ? 40 : 32;
  const h = selected ? 50 : 40;
  const stroke = selected ? '#111827' : '#FFFFFF';
  const strokeWidth = selected ? 3 : 2;
  const badge =
    count > 1
      ? `<circle cx="25" cy="7" r="7" fill="#111827" stroke="#fff" stroke-width="1.5"/>` +
        `<text x="25" y="10.5" font-size="9" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${
          count > 99 ? '99+' : count
        }</text>`
      : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 40">` +
    `<path d="M16 38s12-12.3 12-22A12 12 0 0 0 4 16c0 9.7 12 22 12 22z" fill="${type.color}" stroke="${stroke}" stroke-width="${strokeWidth}"/>` +
    `<text x="16" y="20" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" font-family="sans-serif">${type.letter}</text>` +
    badge +
    `</svg>`;
  return { src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, width: w, height: h };
}
