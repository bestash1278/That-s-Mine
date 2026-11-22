import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Info } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import { toUserError } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { safeRedirectPath, validateLogin } from '../utils/authValidation.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, notice, clearNotice } = useAuth();
  const redirect = safeRedirectPath(searchParams.get('redirect'));
  const reason = location.state?.reason;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (isAuthenticated && !submitting) {
    return <Navigate to={redirect} replace />;
  }

  const set = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const found = validateLogin(form);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await login(form);
      clearNotice();
      navigate(redirect, { replace: true });
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrors(fieldErrors);
      setSubmitError(message);
      setForm((prev) => ({ ...prev, password: '' }));
      document.getElementById('password')?.focus();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const signupLink = redirect !== '/' ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup';

  return (
    <div className="mx-auto max-w-md space-y-5 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text">로그인</h1>
        <p className="mt-1 text-sm text-sub">분실물 조회와 지도는 로그인하지 않아도 이용할 수 있어요.</p>
      </div>

      {(reason || notice) && (
        <p role="status" className="flex gap-2 rounded border-l-4 border-accent bg-blue-50 p-3 text-sm text-primary">
          <Info size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          {notice || reason}
        </p>
      )}

      <Card>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {submitError && (
            <p role="alert" className="rounded border-l-4 border-error bg-red-50 p-3 text-sm text-error">
              {submitError}
            </p>
          )}
          <Input
            label="이메일"
            name="email"
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="예: student@school.ac.kr"
            value={form.email}
            onChange={set('email')}
            required
            error={errors.email}
          />
          <div className="relative">
            <Input
              label="비밀번호"
              name="password"
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={set('password')}
              required
              error={errors.password}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              aria-pressed={showPassword}
              className="absolute right-1 top-8 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sub hover:text-text"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <Button type="submit" disabled={submitting} aria-busy={submitting} className="w-full">
            {submitting ? '로그인하는 중…' : '로그인'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-sub">
        아직 회원이 아니신가요?{' '}
        <Link to={signupLink} className="font-medium text-primary underline">
          회원가입
        </Link>
      </p>

      {import.meta.env.DEV && (
        <p className="rounded bg-gray-100 p-3 text-center text-xs text-gray-700">
          개발 환경 시연 계정: user1@demo.local / demo1234! (관리자: admin@demo.local)
        </p>
      )}
    </div>
  );
}
