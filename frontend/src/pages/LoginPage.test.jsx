import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { clearToken, getToken } from '../utils/authStorage.js';

const loginMock = vi.fn();
vi.mock('../api/auth.js', () => ({
  login: (...args) => loginMock(...args),
  signup: vi.fn(),
  logout: vi.fn(async () => {}),
  getMe: vi.fn(async () => null),
}));

function renderLogin(path = '/login?redirect=%2Freport-found') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/report-found" element={<p>신고 화면</p>} />
          <Route path="/" element={<p>홈 화면</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    window.localStorage.clear();
    clearToken(); // 메모리에 남은 토큰도 비워 테스트끼리 영향을 주지 않게 한다
  });

  it('빈 값이면 서버에 보내지 않고 오류를 보여준다', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(loginMock).not.toHaveBeenCalled();
    expect(screen.getByText('이메일을 입력해 주세요.')).toBeInTheDocument();
  });

  it('로그인하면 토큰을 저장하고 원래 가려던 화면으로 돌아간다', async () => {
    loginMock.mockResolvedValue({ accessToken: 'tkn', user: { userId: 1, nickname: '시연', role: 'USER' } });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'user1@demo.local' } });
    fireEvent.change(screen.getByLabelText(/^비밀번호\*/), { target: { value: 'demo1234!' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('신고 화면')).toBeInTheDocument();
    expect(getToken()).toBe('tkn');
  });

  it('로그인 실패 메시지를 보여주고 비밀번호를 비운다', async () => {
    loginMock.mockRejectedValue({
      request: {},
      response: { status: 401, data: { message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
    });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: 'user1@demo.local' } });
    fireEvent.change(screen.getByLabelText(/^비밀번호\*/), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.');
    expect(screen.getByLabelText(/^비밀번호\*/)).toHaveValue('');
  });
});
