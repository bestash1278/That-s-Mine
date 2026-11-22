import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useReportFoundDraft } from '../contexts/ReportFoundDraftContext.jsx';

/**
 * 직접 로그아웃할 때: 토큰 삭제 + 작성 중이던 신고 초안 삭제(공용 기기에서 다음 사람에게 보이지 않게) + 홈으로.
 * 토큰이 만료돼서 로그아웃된 경우에는 초안을 지우지 않는다(다시 로그인하면 이어서 쓸 수 있게).
 */
export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { resetDraft } = useReportFoundDraft();

  return useCallback(async () => {
    await logout();
    resetDraft();
    navigate('/', { replace: true });
  }, [logout, resetDraft, navigate]);
}
