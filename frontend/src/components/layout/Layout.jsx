import Header from './Header';
import MobileNav from './MobileNav';

export default function Layout({ children }) {
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
