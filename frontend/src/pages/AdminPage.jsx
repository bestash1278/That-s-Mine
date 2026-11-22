import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';
import AdminFoundItems from '../components/admin/AdminFoundItems.jsx';
import AdminLostReports from '../components/admin/AdminLostReports.jsx';
import AdminPlaces from '../components/admin/AdminPlaces.jsx';
import AdminReturnRequests from '../components/admin/AdminReturnRequests.jsx';

const TABS = [
  { key: 'returns', label: '반환 신청' },
  { key: 'found', label: '습득물' },
  { key: 'lost', label: '분실 신고' },
  { key: 'places', label: '장소 관리' },
];

/**
 * 관리자 페이지 (SPEC §16). 접근은 ProtectedRoute(requireAdmin)가 안내하고, 실제 권한은 서버가 판단한다.
 * 선택한 탭은 주소(?tab=)에 남긴다.
 */
export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const active = TABS.some((t) => t.key === tabFromUrl) ? tabFromUrl : 'returns';
  const [notice, setNotice] = useState('');
  const tabRefs = useRef({});

  const select = (key, focus = false) => {
    setSearchParams(key === 'returns' ? {} : { tab: key }, { replace: true });
    setNotice('');
    if (focus) requestAnimationFrame(() => tabRefs.current[key]?.focus());
  };

  // 탭 목록에서 화살표·Home·End로 이동 (WAI-ARIA 탭 패턴)
  const onKeyDown = (e) => {
    const index = TABS.findIndex((t) => t.key === active);
    let next = null;
    if (e.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length];
    else if (e.key === 'ArrowLeft') next = TABS[(index - 1 + TABS.length) % TABS.length];
    else if (e.key === 'Home') next = TABS[0];
    else if (e.key === 'End') next = TABS[TABS.length - 1];
    if (next) {
      e.preventDefault();
      select(next.key, true);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">관리자 페이지</h1>
        <p className="mt-1 text-sm text-sub">반환 신청 처리, 습득물 관리, 분실 신고 조회, 건물·보관 장소를 관리해요.</p>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg border-l-4 border-success bg-green-50 p-3 text-sm text-green-900">
          <CheckCircle size={18} aria-hidden="true" />
          <p className="flex-1">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="안내 닫기"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <div role="tablist" aria-label="관리자 메뉴" onKeyDown={onKeyDown} className="grid grid-cols-4 rounded-lg border border-gray-200 bg-white p-1">
        {TABS.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              type="button"
              role="tab"
              id={`admin-tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`admin-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.key)}
              className={`min-h-[44px] rounded px-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                selected ? 'bg-primary text-white' : 'text-text hover:bg-blue-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section role="tabpanel" id={`admin-panel-${active}`} aria-labelledby={`admin-tab-${active}`} tabIndex={0} className="focus:outline-none">
        {active === 'returns' && <AdminReturnRequests onNotice={setNotice} />}
        {active === 'found' && <AdminFoundItems onNotice={setNotice} />}
        {active === 'lost' && <AdminLostReports />}
        {active === 'places' && <AdminPlaces onNotice={setNotice} />}
      </section>
    </div>
  );
}
