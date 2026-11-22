import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import Button from '../common/Button.jsx';
import CampusMap from './CampusMap.jsx';
import CurrentLocationButton from './CurrentLocationButton.jsx';
import LocationSearch from './LocationSearch.jsx';
import { CAMPUS_CENTER } from '../../constants/map.js';
import { useKakaoLoader } from '../../hooks/useKakaoLoader.js';
import { nearestBuilding } from '../../utils/mapMarkers.js';

const NEAR_BUILDING_METERS = 120;

/**
 * 지도에서 위치 선택 (습득물 신고·분실 신고·보관 장소 등록에서 공통 사용)
 *
 * - 지도를 누르면 그 자리에 핀, 핀을 끌어서 수정, 다시 누르면 위치 변경
 * - 교내 건물 검색·선택 → 건물 위치로 이동하며 핀
 * - 현재 위치로 핀 (권한이 없어도 나머지 기능은 그대로)
 * - "이 위치로 선택"을 눌러야 폼에 반영된다(사용자 최종 확인)
 *
 * 지도 키가 없거나 지도를 못 불러오면 "시연용 위치 선택"으로 건물만 고를 수 있다.
 * 이때는 좌표를 만들지 않고 건물만 돌려준다(실제 지도와 구분).
 *
 * @param onConfirm ({ lat, lng, buildingId, buildingName, nearDistance }) => void
 *                  시연용 선택이면 lat·lng는 null
 */
export default function MapLocationPicker({
  open,
  title = '지도에서 위치 선택',
  description,
  buildings = [],
  initial,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const { status, kakao, retry } = useKakaoLoader();
  const [pin, setPin] = useState(initial?.lat != null ? { lat: Number(initial.lat), lng: Number(initial.lng) } : null);
  const [chosenBuilding, setChosenBuilding] = useState(null);
  const [focus, setFocus] = useState(null);

  // 열릴 때마다 처음 값으로
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setPin(initial?.lat != null ? { lat: Number(initial.lat), lng: Number(initial.lng) } : null);
      setChosenBuilding(null);
    }
  }

  // Esc로 닫기, 열리면 대화상자로 포커스, 뒤 화면 스크롤 막기
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);
  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') cancelRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [open]);

  const near = useMemo(() => (pin ? nearestBuilding(pin, buildings) : null), [pin, buildings]);
  const nearName = near && near.distance <= NEAR_BUILDING_METERS ? near.building.buildingName : null;

  if (!open) return null;

  const mapAvailable = status === 'ready' && kakao;
  const demoMode = status === 'no-key' || status === 'error';
  const start = initial?.lat != null ? { lat: Number(initial.lat), lng: Number(initial.lng) } : CAMPUS_CENTER;

  const selectBuilding = (b) => {
    setChosenBuilding(b);
    if (!demoMode) {
      const p = { lat: Number(b.latitude), lng: Number(b.longitude) };
      setPin(p);
      setFocus({ ...p, level: 2, token: Date.now() });
    }
  };

  const confirm = () => {
    if (demoMode) {
      if (!chosenBuilding) return;
      onConfirm({ lat: null, lng: null, buildingId: chosenBuilding.buildingId, buildingName: chosenBuilding.buildingName });
      return;
    }
    if (!pin) return;
    const building = chosenBuilding || (nearName ? near.building : null);
    onConfirm({
      lat: Number(pin.lat.toFixed(7)),
      lng: Number(pin.lng.toFixed(7)),
      buildingId: building?.buildingId ?? null,
      buildingName: building?.buildingName ?? null,
      nearDistance: near?.distance ?? null,
    });
  };

  const canConfirm = demoMode ? Boolean(chosenBuilding) : Boolean(pin);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-full w-full max-w-3xl flex-col bg-white focus:outline-none sm:h-[90vh] sm:rounded-lg"
      >
        <header className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-text">
              {demoMode ? '시연용 위치 선택' : title}
            </h2>
            {description && !demoMode && <p className="text-sm text-sub">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="위치 선택 닫기"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sub hover:text-text"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {demoMode && (
            <div className="flex gap-2 rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900">
              <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">실제 지도가 아닌 시연용 선택 화면이에요.</p>
                <p>
                  {status === 'no-key'
                    ? '지도 API 키가 설정되지 않아 지도를 표시할 수 없어요.'
                    : '지도를 불러오지 못했어요.'}{' '}
                  건물만 고를 수 있고, 정확한 지점 좌표는 저장되지 않아요.
                </p>
                {status === 'error' && (
                  <button type="button" onClick={retry} className="font-medium underline">
                    지도 다시 불러오기
                  </button>
                )}
              </div>
            </div>
          )}

          <LocationSearch
            buildings={buildings}
            selectedBuildingId={chosenBuilding?.buildingId}
            onSelect={selectBuilding}
            label="교내 건물로 찾기"
          />

          {!demoMode && (
            <>
              <p className="text-sm text-sub">
                지도를 눌러 위치를 찍고, 핀을 끌어서 옮길 수 있어요. 층수·강의실은 신고서의 &lsquo;상세 위치&rsquo;에 적어 주세요.
              </p>
              <div className="relative h-[45vh] min-h-[280px] overflow-hidden rounded border border-gray-200">
                {mapAvailable ? (
                  <CampusMap
                    kakao={kakao}
                    center={start}
                    level={initial?.lat != null ? 2 : 3}
                    cluster={false}
                    pin={pin}
                    onPinMove={setPin}
                    onClick={(p) => {
                      setPin(p);
                      setChosenBuilding(null);
                    }}
                    focus={focus}
                    ariaLabel="위치 선택 지도. 건물 목록으로도 선택할 수 있어요."
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-50 text-sm text-sub">지도를 불러오는 중…</div>
                )}
                <CurrentLocationButton
                  className="absolute bottom-3 left-3 z-10"
                  label="현재 위치로"
                  onLocate={(p) => {
                    const pos = { lat: p.lat, lng: p.lng };
                    setPin(pos);
                    setChosenBuilding(null);
                    setFocus({ ...pos, level: 2, token: Date.now() });
                  }}
                />
              </div>
            </>
          )}

          <p aria-live="polite" className="rounded bg-gray-50 p-3 text-sm text-text">
            {demoMode
              ? chosenBuilding
                ? `선택한 건물: ${chosenBuilding.buildingName}`
                : '건물을 선택해 주세요.'
              : pin
                ? `선택한 위치: ${chosenBuilding?.buildingName || (nearName ? `${nearName} 근처` : '교내 건물과 떨어진 곳')}`
                : '아직 위치를 선택하지 않았어요.'}
          </p>
        </div>

        <footer className="flex gap-3 border-t border-gray-200 p-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            취소
          </Button>
          <Button type="button" onClick={confirm} disabled={!canConfirm} className="flex-[2]">
            {demoMode ? '이 건물로 선택' : '이 위치로 선택'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
