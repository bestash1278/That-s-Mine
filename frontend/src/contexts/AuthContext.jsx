import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';
import { UNAUTHORIZED_EVENT, clearToken, getToken, setToken } from '../utils/authStorage.js';

/**
 * 로그인 상태.
 * status: 'loading'(저장된 토큰 확인 중) | 'authenticated' | 'guest'
 * 관리자 여부(user.role)는 화면 표시에만 쓰고, 실제 권한은 서버가 판단한다.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'guest'));
  const [notice, setNotice] = useState(null); // 예: 로그인 만료 안내

  // 저장된 토큰이 있으면 내 정보를 불러와 확인
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    authApi
      .getMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setUser(null);
        setStatus('guest');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // API가 401을 받으면(토큰 만료·사용자 삭제) 로그아웃 상태로
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setStatus('guest');
      setNotice('로그인 정보가 만료되었습니다. 다시 로그인해 주세요.');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const applyAuth = useCallback((result) => {
    setToken(result.accessToken);
    setUser(result.user);
    setStatus('authenticated');
    setNotice(null);
    return result.user;
  }, []);

  const login = useCallback(async (credentials) => applyAuth(await authApi.login(credentials)), [applyAuth]);
  const signup = useCallback(async (form) => applyAuth(await authApi.signup(form)), [applyAuth]);

  const logout = useCallback(async () => {
    await authApi.logout();
    clearToken();
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isAdmin: user?.role === 'ADMIN',
      notice,
      clearNotice: () => setNotice(null),
      login,
      signup,
      logout,
      setUser,
    }),
    [user, status, notice, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.');
  return context;
}
