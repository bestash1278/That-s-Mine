import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import ItemsPage from './pages/ItemsPage.jsx';
import ItemDetailPage from './pages/ItemDetailPage.jsx';
import ComingSoonPage from './pages/ComingSoonPage.jsx';
import './App.css';

function App() {
  return (
    <Layout>
      <Routes>
        {/* 1. 메인 페이지 */}
        <Route path="/" element={<HomePage />} />

        {/* 2. 조회 페이지 (검색 결과) */}
        <Route path="/items" element={<ItemsPage />} />

        {/* 3. 상세 페이지 */}
        <Route path="/items/:id" element={<ItemDetailPage />} />

        {/* 4. 습득물 신고 */}
        <Route path="/report-found" element={<ComingSoonPage title="습득물 신고" />} />

        {/* 5. 분실 신고 */}
        <Route path="/report-lost" element={<ComingSoonPage title="분실 신고" />} />

        {/* 6. 지도 조회 */}
        <Route path="/map" element={<ComingSoonPage title="지도에서 조회" />} />

        {/* 7. 로그인 */}
        <Route path="/login" element={<ComingSoonPage title="로그인" />} />

        {/* 8. 회원가입 */}
        <Route path="/signup" element={<ComingSoonPage title="회원가입" />} />

        {/* 9. 마이페이지 */}
        <Route path="/mypage" element={<ComingSoonPage title="마이페이지" />} />

        {/* 10. 반환 신청 */}
        <Route path="/return-request/:id" element={<ComingSoonPage title="반환 신청" />} />

        {/* 11. 관리자 페이지 */}
        <Route path="/admin" element={<ComingSoonPage title="관리자 페이지" />} />
      </Routes>
    </Layout>
  );
}

export default App;
