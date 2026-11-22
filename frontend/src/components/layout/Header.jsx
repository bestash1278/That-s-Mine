import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLogout } from '../../hooks/useLogout.js';

const NAV_ITEMS = [
  { path: '/', label: '홈', end: true },
  { path: '/items', label: '분실물 조회' },
  { path: '/report-found', label: '습득물 신고' },
  { path: '/report-lost', label: '분실 신고' },
  { path: '/map', label: '지도 조회' },
];

/** PC 상단 내비게이션 (SPEC §6) */
export default function Header() {
  const { isAuthenticated, isAdmin, user, status } = useAuth();
  const handleLogout = useLogout();

  const linkClass = ({ isActive }) =>
    `inline-flex min-h-[44px] min-w-[44px] items-center justify-center border-b-2 px-1 font-medium transition-opacity hover:opacity-90 ${
      isActive ? 'border-white' : 'border-transparent opacity-90'
    }`;

  return (
    <header className="sticky top-0 z-40 hidden bg-primary text-white lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-2">
        <Link to="/" className="inline-flex min-h-[44px] items-center text-2xl font-bold">
          That&apos;s Mine
          <span className="sr-only"> 교내 분실물 조회 및 신고</span>
        </Link>

        <nav aria-label="주요 메뉴" className="flex gap-5">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              관리자
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-4" aria-live="polite">
          {status === 'loading' ? null : isAuthenticated ? (
            <>
              <NavLink to="/mypage" className={linkClass}>
                마이페이지<span className="sr-only"> ({user?.nickname})</span>
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[44px] items-center font-medium opacity-90 hover:opacity-100"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>
                로그인
              </NavLink>
              <Link
                to="/signup"
                className="inline-flex min-h-[44px] items-center rounded bg-white px-3 font-medium text-primary hover:bg-blue-50"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
