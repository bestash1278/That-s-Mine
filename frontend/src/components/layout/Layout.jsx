import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import MobileNav from './MobileNav';
import { pageTitle } from '../../utils/pageTitle.js';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  // 화면을 옮길 때마다 문서 제목을 바꾼다
  useEffect(() => {
    document.title = pageTitle(pathname);
  }, [pathname]);

  return (
    <div className="bg-bg min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
