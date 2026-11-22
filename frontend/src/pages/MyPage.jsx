import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';
import ProfileSection from '../components/mypage/ProfileSection.jsx';
import MyFoundItemList from '../components/mypage/MyFoundItemList.jsx';
import MyLostReportList from '../components/mypage/MyLostReportList.jsx';
import MyReturnRequestList from '../components/mypage/MyReturnRequestList.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const TABS = [
  { key: 'profile', label: '내 정보' },
  { key: 'found', label: '습득물' },
  { key: 'lost', label: '분실 신고' },
  { key: 'returns', label: '반환 신청' },
];

/**
 * 마이페이지 (SPEC §14): 회원 정보 수정, 내 습득물·분실 신고·반환 신청 목록, 상태 확인, 수정·삭제, 로그아웃
 * 선택한 탭은 주소(?tab=)에 남겨서 수정 화면에 갔다가 돌아와도 같은 탭이 열린다.
 */
export default function MyPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const active = TABS.some((t) => t.key === tabFromUrl) ? tabFromUrl : 'profile';
  const [notice, setNotice] = useState(location.state?.notice || '');
  const tabRefs = useRef({});

  // 다른 화면에서 넘겨준 안내는 한 번만 보여주고 history state에서 지운다(새로 고침 시 다시 안 뜨게)
  useEffect(() => {
    if (location.state?.notice) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (key, focus = false) => {
    setSearchParams(key === 'profile' ? {} : { tab: key }, { replace: true });
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text">마이페이지</h1>
        {user && <p className="mt-1 text-sm text-sub">{user.nickname}님의 신고와 신청을 관리할 수 있어요.</p>}
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

      <div role="tablist" aria-label="마이페이지 메뉴" onKeyDown={onKeyDown} className="grid grid-cols-4 rounded-lg border border-gray-200 bg-white p-1">
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
              id={`tab-${tab.key}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.key}`}
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

      <section role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0} className="focus:outline-none">
        {active === 'profile' && <ProfileSection />}
        {active === 'found' && <MyFoundItemList onNotice={setNotice} />}
        {active === 'lost' && <MyLostReportList onNotice={setNotice} />}
        {active === 'returns' && <MyReturnRequestList onNotice={setNotice} />}
      </section>
    </div>
  );
}
