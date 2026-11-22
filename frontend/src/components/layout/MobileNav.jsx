import { NavLink } from 'react-router-dom';
import { Home, LogIn, Map, Plus, Search, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

/** 모바일 하단 내비게이션 (SPEC §6): 홈 / 조회 / 신고 / 지도 / 내 정보 */
export default function MobileNav() {
  const { isAuthenticated } = useAuth();

  const navItems = [
    { path: '/', label: '홈', icon: Home, end: true },
    { path: '/items', label: '조회', icon: Search },
    { path: '/report-found', label: '신고', icon: Plus },
    { path: '/map', label: '지도', icon: Map },
    isAuthenticated
      ? { path: '/mypage', label: '내 정보', icon: User }
      : { path: '/login', label: '로그인', icon: LogIn },
  ];

  return (
    <nav aria-label="하단 메뉴" className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-card lg:hidden">
      <ul className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[64px] flex-col items-center justify-center border-t-2 px-2 py-2 transition-colors ${
                    isActive ? 'border-primary font-medium text-primary' : 'border-transparent text-sub'
                  }`
                }
              >
                <Icon size={24} aria-hidden="true" />
                <span className="mt-1 text-xs">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
