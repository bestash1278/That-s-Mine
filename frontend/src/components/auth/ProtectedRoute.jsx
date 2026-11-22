import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Card from '../common/Card.jsx';
import LoadingState from '../common/LoadingState.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { loginPathFor } from '../../utils/authValidation.js';

/**
 * 로그인이 필요한 화면. 로그인하지 않았으면 로그인 화면으로 보내고, 로그인 후 이 화면으로 돌아온다.
 * requireAdmin이면 관리자만. (화면 보호일 뿐이고 실제 권한은 서버가 다시 확인한다)
 */
export default function ProtectedRoute({ children, requireAdmin = false, reason }) {
  const { status, isAdmin } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status !== 'authenticated') {
    return (
      <Navigate
        to={loginPathFor(location)}
        replace
        state={{ reason: reason || '로그인이 필요한 기능이에요. 로그인하면 하던 화면으로 돌아갑니다.' }}
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <ShieldAlert size={40} className="mx-auto text-error" aria-hidden="true" />
        <h1 className="text-xl font-bold text-text">관리자만 사용할 수 있는 화면이에요</h1>
        <p className="text-sub">관리자 계정으로 로그인해 주세요.</p>
        <Link to="/" className="inline-flex min-h-[44px] items-center justify-center rounded bg-primary px-4 font-medium text-white">
          홈으로
        </Link>
      </Card>
    );
  }

  return children;
}
