import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, List, Map as MapIcon, MapPinOff, RefreshCw } from 'lucide-react';
import client, { toUserError } from '../api/client.js';
import { getLostReportsInBounds } from '../api/lostReports.js';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import CampusMap from '../components/map/CampusMap.jsx';
import CurrentLocationButton from '../components/map/CurrentLocationButton.jsx';
import MapItemPopup from '../components/map/MapItemPopup.jsx';
import MapLegend from '../components/map/MapLegend.jsx';
import MapSearchFilter from '../components/map/MapSearchFilter.jsx';
import { CAMPUS_CENTER, DEFAULT_MAP_LEVEL, DEFAULT_VISIBLE_TYPES } from '../constants/map.js';
import { useItemSearch } from '../hooks/useItemSearch.js';
import { useKakaoLoader } from '../hooks/useKakaoLoader.js';
import { formatDate } from '../utils/dateUtils.js';
import {
  boundsChangedMeaningfully,
  buildLostMarkerGroups,
  buildMarkerGroups,
  findGroupKeyForItem,
  getFoundPosition,
} from '../utils/mapMarkers.js';
import { formatLostPeriod } from '../utils/lostReportForm.js';
import { buildQueryString } from '../utils/queryParser.js';

// 상세 화면에 갔다가 돌아왔을 때 지도 위치를 유지하기 위한 마지막 화면(페이지를 새로 고치면 초기화)
let lastView = null;

function toParams(bounds, filters) {
  return {
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLng: bounds.minLng,
    maxLng: bounds.maxLng,
    keyword: filters.keyword || undefined,
    categoryId: filters.categoryId || undefined,
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  };
}

/** 왼쪽 목록(모바일은 하단 목록)의 한 줄 */
function ResultRow({ item, highlighted, onShowOnMap, linkState }) {
  const hasPosition = Boolean(getFoundPosition(item));
  return (
    <li className={`flex gap-3 p-3 ${highlighted ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-text">{item.title}</p>
          <StatusBadge status={item.status} label={item.statusLabel} />
        </div>
        <p className="text-sm text-sub">
          발견 {formatDate(item.foundDate)} · {item.foundBuildingName || item.foundLocation}
        </p>
        <p className="text-sm text-sub">보관 {item.storageStatusLabel}</p>
      </div>
      <div className="flex flex-shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => onShowOnMap(item)}
          disabled={!hasPosition}
          className="min-h-[40px] rounded border border-gray-300 px-2 text-xs font-medium text-primary hover:border-primary disabled:text-sub"
          aria-label={`${item.title} 지도에서 보기`}
        >
          지도에서 보기
        </button>
        <Link
          to={`/items/${item.itemId}`}
          state={linkState}
          className="inline-flex min-h-[40px] items-center justify-center rounded bg-primary px-2 text-xs font-medium text-white hover:bg-blue-900"
          aria-label={`${item.title} 상세 보기`}
        >
          상세 보기
        </Link>
      </div>
    </li>
  );
}

/** 목록의 분실 신고 한 줄 (주황색) */
function LostRow({ report, highlighted, onShowOnMap }) {
  return (
    <li className={`flex gap-3 p-3 ${highlighted ? 'bg-orange-50' : 'bg-white'}`}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">분실 신고</span>
          <p className="font-medium text-text">{report.title}</p>
        </div>
        <p className="text-sm text-sub">
          {formatLostPeriod(report.lostDate, report.lostEndDate, formatDate)} · {report.lostBuildingName || report.lostLocation}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => onShowOnMap(report)}
          className="min-h-[40px] rounded border border-gray-300 px-2 text-xs font-medium text-primary hover:border-primary"
          aria-label={`${report.title} 분실 신고 지도에서 보기`}
        >
          지도에서 보기
        </button>
        <Link
          to={`/lost-reports/${report.reportId}`}
          className="inline-flex min-h-[40px] items-center justify-center rounded border-2 border-orange-600 px-2 text-xs font-medium text-orange-800 hover:bg-orange-50"
          aria-label={`${report.title} 분실 신고 보기`}
        >
          신고 보기
        </Link>
      </div>
    </li>
  );
}

/** 지도를 쓸 수 없을 때: 안내 + 건물별 목록(대체 수단) */
function MapUnavailable({ sdkStatus, onRetry, filters, linkState }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    client
      .get('/found-items', {
        params: {
          keyword: filters.keyword || undefined,
          categoryId: filters.categoryId || undefined,
          status: filters.status || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          size: 50,
        },
      })
      .then((res) => {
        if (!cancelled) setItems(res.data?.data?.content || []);
      })
      .catch((err) => {
        if (!cancelled) setError(toUserError(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const byBuilding = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const key = item.foundBuildingName || item.foundLocation || '기타 장소';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()];
  }, [items]);

  const query = buildQueryString(filters, { includeListOnly: false });

  return (
    <div className="space-y-4">
      <Card className="flex gap-3 border-l-4 border-amber-500 bg-amber-50">
        <MapPinOff size={22} className="mt-0.5 flex-shrink-0 text-amber-700" aria-hidden="true" />
        <div className="space-y-2 text-sm text-amber-900">
          <p className="font-medium">
            {sdkStatus === 'no-key'
              ? '지도 API 키가 설정되지 않아 지도를 표시할 수 없어요.'
              : '지도를 불러오지 못했어요. 인터넷 연결이나 지도 키·허용 도메인 설정을 확인해 주세요.'}
          </p>
          <p>대신 발견한 건물별로 물품을 보여드려요. 모든 정보는 목록·상세 화면에서 똑같이 확인할 수 있어요.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={query ? `/items?${query}` : '/items'}
              className="inline-flex min-h-[44px] items-center gap-1 rounded bg-primary px-3 font-medium text-white"
            >
              <List size={16} aria-hidden="true" /> 목록으로 보기
            </Link>
            {sdkStatus === 'error' && (
              <Button variant="outline" onClick={onRetry}>
                지도 다시 불러오기
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <p role="alert" className="text-error">
          {error}
        </p>
      ) : byBuilding.length === 0 ? (
        <p className="text-sub">조건에 맞는 물품이 없어요.</p>
      ) : (
        byBuilding.map(([building, list]) => (
          <section key={building} aria-label={`${building} 물품`} className="overflow-hidden rounded-lg border border-gray-200">
            <h2 className="bg-gray-50 px-3 py-2 font-medium text-text">
              {building} <span className="text-sm text-sub">· {list.length}건</span>
            </h2>
            <ul className="divide-y divide-gray-100">
              {list.map((item) => (
                <li key={item.itemId}>
                  <Link
                    to={`/items/${item.itemId}`}
                    state={linkState}
                    className="flex min-h-[44px] items-center justify-between gap-2 bg-white px-3 py-2 hover:bg-blue-50"
                  >
                    <span>
                      <span className="font-medium text-text">{item.title}</span>
                      <span className="block text-sm text-sub">보관 {item.storageStatusLabel}</span>
                    </span>
                    <StatusBadge status={item.status} label={item.statusLabel} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

export default function MapPage() {
  const location = useLocation();
  const { filters, setFilters, clearAllFilters } = useItemSearch('/map');
  const { status: sdkStatus, kakao, retry } = useKakaoLoader();

  const [visibleTypes, setVisibleTypes] = useState(DEFAULT_VISIBLE_TYPES);
  const [items, setItems] = useState([]);
  const [lostReports, setLostReports] = useState([]);
  const [lostError, setLostError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [searchedBounds, setSearchedBounds] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [focus, setFocus] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const requestSeq = useRef(0);
  const didInitialSearch = useRef(false);

  const linkState = { from: location.pathname + location.search };
  const listQuery = buildQueryString(filters, { includeListOnly: false });

  const search = useCallback(async (bounds, activeFilters) => {
    const seq = (requestSeq.current += 1);
    setLoading(true);
    setError(null);
    const params = toParams(bounds, activeFilters);
    // 분실 신고(주황색)는 따로 불러온다. 실패해도 습득물 지도는 그대로 쓸 수 있게 한다.
    const lostParams = { ...params };
    delete lostParams.status; // 분실 신고는 '찾는 중'만 지도에 나온다
    getLostReportsInBounds(lostParams)
      .then((reports) => {
        if (seq !== requestSeq.current) return;
        setLostReports(reports);
        setLostError(null);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setLostReports([]);
        setLostError('분실 신고 위치를 불러오지 못했어요.');
      });
    try {
      const res = await client.get('/found-items/map', { params });
      if (seq !== requestSeq.current) return; // 더 최근 요청이 있으면 무시
      setItems(res.data?.data || []);
      setSearchedBounds(bounds);
      setSelectedKey(null);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(toUserError(err, '지도 영역의 물품을 불러오지 못했습니다.').message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // 처음 지도가 준비되면(첫 idle) 자동으로 한 번 검색
  const handleIdle = useCallback(
    (bounds, level) => {
      setCurrentBounds(bounds);
      lastView = {
        center: { lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 },
        level,
      };
      if (!didInitialSearch.current) {
        didInitialSearch.current = true;
        search(bounds, filters);
      }
    },
    [search, filters],
  );

  // 검색 조건(URL)이 바뀌면 지금 보고 있는 영역으로 다시 검색
  const filterKey = listQuery;
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    if (currentBounds) search(currentBounds, filters);
  }, [filterKey, currentBounds, filters, search]);

  const groups = useMemo(
    () => [...buildMarkerGroups(items, visibleTypes), ...buildLostMarkerGroups(lostReports, visibleTypes)],
    [items, lostReports, visibleTypes],
  );
  const selectedGroup = groups.find((g) => g.key === selectedKey) || null;
  const highlightedIds = new Set(selectedGroup?.type === 'LOST' ? [] : selectedGroup?.items.map((i) => i.itemId) || []);
  const highlightedLostIds = new Set(selectedGroup?.type === 'LOST' ? selectedGroup.items.map((r) => r.reportId) : []);
  const showLost = visibleTypes.includes('LOST');
  const canResearch = currentBounds && searchedBounds && boundsChangedMeaningfully(searchedBounds, currentBounds);

  const showOnMap = (item) => {
    const key = findGroupKeyForItem(groups, item.itemId);
    const pos = getFoundPosition(item);
    if (!pos) return;
    setSelectedKey(key);
    setFocus({ lat: pos.lat, lng: pos.lng, token: Date.now() });
    setListOpen(false);
  };

  const showLostOnMap = (report) => {
    const lat = Number(report.markerLatitude);
    const lng = Number(report.markerLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const group = groups.find((g) => g.type === 'LOST' && g.items.some((r) => r.reportId === report.reportId));
    setSelectedKey(group?.key ?? null);
    setFocus({ lat, lng, token: Date.now() });
    setListOpen(false);
  };

  const handleGroupClick = useCallback((group) => {
    setSelectedKey(group.key);
  }, []);

  const applyFilters = (next) => setFilters({ ...filters, ...next });

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-text">지도에서 찾기</h1>
      <nav aria-label="조회 방식" className="inline-flex overflow-hidden rounded border border-primary">
        <Link
          to={listQuery ? `/items?${listQuery}` : '/items'}
          className="inline-flex min-h-[44px] items-center gap-1 px-3 text-sm font-medium text-primary hover:bg-blue-50"
        >
          <List size={16} aria-hidden="true" /> 목록 보기
        </Link>
        <span aria-current="page" className="inline-flex min-h-[44px] items-center gap-1 bg-primary px-3 text-sm font-medium text-white">
          <MapIcon size={16} aria-hidden="true" /> 지도 보기
        </span>
      </nav>
    </div>
  );

  // ---- 지도를 쓸 수 없는 경우
  if (sdkStatus === 'no-key' || sdkStatus === 'error') {
    return (
      <div className="space-y-4">
        {header}
        <Card>
          <MapSearchFilter filters={filters} onApply={applyFilters} onReset={clearAllFilters} collapsible />
        </Card>
        <MapUnavailable sdkStatus={sdkStatus} onRetry={retry} filters={filters} linkState={linkState} />
      </div>
    );
  }

  const resultList = (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <p className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-sm text-sub" aria-live="polite">
        {loading ? '불러오는 중…' : `이 지역의 습득물 ${items.length}건`}
      </p>
      {items.length === 0 && !loading ? (
        <p className="p-4 text-sm text-sub">
          이 지역에는 조건에 맞는 물품이 없어요. 지도를 옮기거나 축소한 뒤 &lsquo;이 지역에서 다시 검색&rsquo;을 눌러 보세요.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <ResultRow
              key={item.itemId}
              item={item}
              highlighted={highlightedIds.has(item.itemId)}
              onShowOnMap={showOnMap}
              linkState={linkState}
            />
          ))}
        </ul>
      )}
      {showLost && lostReports.length > 0 && (
        <>
          <p className="border-y border-gray-100 bg-orange-50 px-3 py-2 text-sm text-orange-900">
            이 지역의 분실 신고 {lostReports.length}건 · 이 물건을 주웠다면 습득물로 신고해 주세요
          </p>
          <ul className="divide-y divide-gray-100">
            {lostReports.map((report) => (
              <LostRow
                key={report.reportId}
                report={report}
                highlighted={highlightedLostIds.has(report.reportId)}
                onShowOnMap={showLostOnMap}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {header}

      <div className="lg:grid lg:h-[calc(100vh-11rem)] lg:min-h-[560px] lg:grid-cols-[380px_1fr] lg:gap-4">
        {/* 왼쪽(PC) / 위쪽(모바일): 검색 조건 + 목록 */}
        <aside className="space-y-3 lg:overflow-y-auto lg:pr-1">
          <Card>
            <MapSearchFilter filters={filters} onApply={applyFilters} onReset={clearAllFilters} collapsible />
          </Card>
          <MapLegend visibleTypes={visibleTypes} onChange={setVisibleTypes} compact />
          {showLost && lostError && <p className="text-sm text-error">{lostError}</p>}
          <div className="hidden lg:block">{resultList}</div>
        </aside>

        {/* 지도 */}
        <div className="relative mt-3 h-[55vh] min-h-[320px] overflow-hidden rounded-lg border border-gray-200 lg:mt-0 lg:h-full">
          {sdkStatus === 'loading' || !kakao ? (
            <div className="flex h-full items-center justify-center bg-gray-50">
              <LoadingState />
            </div>
          ) : (
            <CampusMap
              kakao={kakao}
              center={lastView?.center || CAMPUS_CENTER}
              level={lastView?.level || DEFAULT_MAP_LEVEL}
              groups={groups}
              selectedKey={selectedKey}
              onGroupClick={handleGroupClick}
              onIdle={handleIdle}
              focus={focus}
              ariaLabel="습득물·분실 신고 위치 지도. 같은 정보는 목록에서도 볼 수 있어요."
            />
          )}

          {/* 지도 위 조작 */}
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex flex-col items-center gap-2 px-2">
            {canResearch && (
              <button
                type="button"
                onClick={() => search(currentBounds, filters)}
                disabled={loading}
                className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-white shadow-lg hover:bg-blue-900 disabled:opacity-60"
              >
                <RefreshCw size={16} aria-hidden="true" /> 이 지역에서 다시 검색
              </button>
            )}
            {error && (
              <p role="alert" className="pointer-events-auto rounded bg-white px-3 py-2 text-sm text-error shadow">
                {error}
              </p>
            )}
          </div>
          <CurrentLocationButton
            className="absolute bottom-3 left-3 z-10"
            onLocate={(pos) => setFocus({ ...pos, level: 3, token: Date.now() })}
          />

          {/* PC: 선택한 마커의 물품 카드 */}
          {selectedGroup && (
            <div className="absolute bottom-3 right-14 z-10 hidden w-96 lg:block">
              <MapItemPopup group={selectedGroup} onClose={() => setSelectedKey(null)} linkState={linkState} />
            </div>
          )}
        </div>

        {/* 모바일: 선택한 물품 카드 또는 접이식 목록 */}
        <div className="mt-3 space-y-3 lg:hidden">
          {selectedGroup ? (
            <MapItemPopup group={selectedGroup} onClose={() => setSelectedKey(null)} linkState={linkState} />
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setListOpen((v) => !v)}
                aria-expanded={listOpen}
                aria-controls="map-result-list"
                className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 font-medium text-text"
              >
                <span>
                  목록으로 보기 <span className="text-sm text-sub">({items.length}건)</span>
                </span>
                {listOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
              </button>
              {listOpen && (
                <div id="map-result-list" className="mt-2">
                  {resultList}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
