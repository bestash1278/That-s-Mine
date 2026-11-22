import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import ItemsPage from './pages/ItemsPage.jsx';
import ItemDetailPage from './pages/ItemDetailPage.jsx';
import ReportFoundPage from './pages/ReportFoundPage.jsx';
import ReportFoundPreviewPage from './pages/ReportFoundPreviewPage.jsx';
import ReportFoundCompletePage from './pages/ReportFoundCompletePage.jsx';
import ComingSoonPage from './pages/ComingSoonPage.jsx';
import MapPage from './pages/MapPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import MyPage from './pages/MyPage.jsx';
import ReportLostPage from './pages/ReportLostPage.jsx';
import ReportLostCompletePage from './pages/ReportLostCompletePage.jsx';
import LostReportDetailPage from './pages/LostReportDetailPage.jsx';
import EditLostReportPage from './pages/EditLostReportPage.jsx';
import EditFoundItemPage from './pages/EditFoundItemPage.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ReportFoundDraftProvider } from './contexts/ReportFoundDraftContext.jsx';

const protect = (element, options = {}) => <ProtectedRoute {...options}>{element}</ProtectedRoute>;

function App() {
  return (
    <AuthProvider>
      <ReportFoundDraftProvider>
        <Layout>
          <Routes>
            {/* 비회원도 이용: 메인, 조회, 상세, 지도, 분실 신고 상세 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/lost-reports/:id" element={<LostReportDetailPage />} />

            {/* 로그인·회원가입 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* 로그인 필요: 습득물 신고(작성 → 확인 → 완료) */}
            <Route
              path="/report-found"
              element={protect(<ReportFoundPage />, { reason: '습득물을 신고하려면 로그인해 주세요. 로그인하면 신고 화면으로 돌아갑니다.' })}
            />
            <Route path="/report-found/preview" element={protect(<ReportFoundPreviewPage />)} />
            <Route path="/report-found/complete/:id" element={protect(<ReportFoundCompletePage />)} />

            {/* 로그인 필요: 분실 신고, 마이페이지, 반환 신청 */}
            <Route
              path="/report-lost"
              element={protect(<ReportLostPage />, {
                reason: '분실 신고를 하려면 로그인해 주세요. 로그인하면 입력하던 검색 조건으로 신고 화면이 열립니다.',
              })}
            />
            <Route path="/report-lost/complete/:id" element={protect(<ReportLostCompletePage />)} />
            <Route path="/mypage" element={protect(<MyPage />)} />
            <Route path="/mypage/found-items/:id/edit" element={protect(<EditFoundItemPage />)} />
            <Route path="/mypage/lost-reports/:id/edit" element={protect(<EditLostReportPage />)} />
            <Route
              path="/return-request/:id"
              element={protect(<ComingSoonPage title="반환 신청" />, { reason: '반환을 신청하려면 로그인해 주세요.' })}
            />

            {/* 관리자 */}
            <Route path="/admin" element={protect(<ComingSoonPage title="관리자 페이지" />, { requireAdmin: true })} />

            <Route path="*" element={<ComingSoonPage title="페이지를 찾을 수 없습니다" />} />
          </Routes>
        </Layout>
      </ReportFoundDraftProvider>
    </AuthProvider>
  );
}

export default App;
