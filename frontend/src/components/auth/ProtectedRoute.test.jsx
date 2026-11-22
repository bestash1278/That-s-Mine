import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';

const authState = { status: 'guest', isAdmin: false };
vi.mock('../../contexts/AuthContext.jsx', () => ({ useAuth: () => authState }));

function LoginProbe() {
  const location = useLocation();
  return <p>로그인 화면 {location.search}</p>;
}

function renderAt(path, options = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/report-found"
          element={
            <ProtectedRoute {...options}>
              <p>신고 화면</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('비로그인은 로그인 화면으로 보내고 돌아올 주소를 넘긴다', () => {
    authState.status = 'guest';
    renderAt('/report-found');
    expect(screen.getByText(/로그인 화면/)).toHaveTextContent('?redirect=%2Freport-found');
  });

  it('로그인했으면 화면을 보여준다', () => {
    authState.status = 'authenticated';
    renderAt('/report-found');
    expect(screen.getByText('신고 화면')).toBeInTheDocument();
  });

  it('관리자 화면은 일반 사용자에게 안내만 보여준다', () => {
    authState.status = 'authenticated';
    authState.isAdmin = false;
    renderAt('/report-found', { requireAdmin: true });
    expect(screen.getByText('관리자만 사용할 수 있는 화면이에요')).toBeInTheDocument();
    expect(screen.queryByText('신고 화면')).not.toBeInTheDocument();
  });
});
