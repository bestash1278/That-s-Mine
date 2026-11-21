import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Map, User } from 'lucide-react';

export default function MobileNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '홈', icon: Home },
    { path: '/items', label: '조회', icon: Search },
    { path: '/report-found', label: '신고', icon: Plus },
    { path: '/map', label: '지도', icon: Map },
    { path: '/mypage', label: '내 정보', icon: User },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-gray-200 z-40">
      <div className="flex justify-around items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                isActive(item.path) ? 'text-primary border-t-2 border-primary' : 'text-sub'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
