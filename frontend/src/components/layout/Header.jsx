import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '홈' },
    { path: '/items', label: '조회' },
    { path: '/report-found', label: '신고' },
    { path: '/map', label: '지도' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <header className="hidden lg:block bg-primary text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          That's Mine
        </Link>

        <nav className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-medium hover:opacity-80 transition-opacity ${
                isActive(item.path) ? 'border-b-2 border-white' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex gap-4">
          <Link to="/login" className="font-medium hover:opacity-80">
            로그인
          </Link>
        </div>
      </div>
    </header>
  );
}
