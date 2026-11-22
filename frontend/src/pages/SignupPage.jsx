import { useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Input from '../components/common/Input.jsx';
import { checkEmailAvailable } from '../api/auth.js';
import { toUserError } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PASSWORD_RULES, isValidEmail, safeRedirectPath, validateSignup } from '../utils/authValidation.js';

const FIELD_ORDER = ['email', 'password', 'passwordConfirm', 'nickname'];
const LABELS = { email: '이메일', password: '비밀번호', passwordConfirm: '비밀번호 확인', nickname: '닉네임' };

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, isAuthenticated } = useAuth();
  const redirect = safeRedirectPath(searchParams.get('redirect'));

  const [form, setForm] = useState({ email: '', password: '', passwordConfirm: '', nickname: '' });
  const [errors, setErrors] = useState({});
  const [emailStatus, setEmailStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const lastChecked = useRef('');

  if (isAuthenticated && !submitting) {
    return <Navigate to={redirect} replace />;
  }

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (key === 'email') setEmailStatus(null);
  };

  // 이메일 칸을 벗어나면 중복 확인
  const checkEmail = async () => {
    const email = form.email.trim();
    if (!isValidEmail(email) || lastChecked.current === email) return;
    lastChecked.current = email;
    setEmailStatus('checking');
    try {
      const available = await checkEmailAvailable(email);
      setEmailStatus(available ? 'available' : 'taken');
      if (!available) setErrors((prev) => ({ ...prev, email: '이미 사용 중인 이메일입니다.' }));
    } catch {
      setEmailStatus(null); // 확인 실패는 가입할 때 서버가 다시 확인한다
      lastChecked.current = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const found = validateSignup(form);
    if (emailStatus === 'taken' && !found.email) found.email = '이미 사용 중인 이메일입니다.';
    setErrors(found);
    setSubmitError(null);
    const first = FIELD_ORDER.find((k) => found[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await signup(form);
      navigate(redirect, { replace: true });
    } catch (err) {
      const { message, fieldErrors } = toUserError(err, '회원가입하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrors(fieldErrors);
      setSubmitError(message);
      const firstServer = FIELD_ORDER.find((k) => fieldErrors[k]);
      if (firstServer) document.getElementById(firstServer)?.focus();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const errorKeys = FIELD_ORDER.filter((k) => errors[k]);
  const loginLink = redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';

  return (
    <div className="mx-auto max-w-md space-y-5 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text">회원가입</h1>
        <p className="mt-1 text-sm text-sub">습득물·분실 신고와 반환 신청은 회원만 할 수 있어요.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {(submitError || errorKeys.length > 0) && (
            <div role="alert" className="rounded border-l-4 border-error bg-red-50 p-3 text-sm text-error">
              <p className="font-medium">
                {errorKeys.length > 0 ? `${errorKeys.length}개 항목을 확인해 주세요.` : submitError}
              </p>
              {errorKeys.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {errorKeys.map((k) => (
                    <li key={k}>
                      {LABELS[k]}: {errors[k]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
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
              onBlur={checkEmail}
              required
              error={errors.email}
            />
            <p aria-live="polite" className="mt-1 text-sm">
              {emailStatus === 'checking' && <span className="text-sub">사용할 수 있는지 확인하는 중…</span>}
              {emailStatus === 'available' && !errors.email && <span className="text-success">사용할 수 있는 이메일이에요.</span>}
            </p>
          </div>

          <div>
            <Input
              label="비밀번호"
              name="password"
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              required
              error={errors.password}
              aria-describedby="password-rules"
            />
            <ul id="password-rules" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="비밀번호 조건">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(form.password);
                return (
                  <li key={rule.key} className={`flex items-center gap-1 ${ok ? 'text-success' : 'text-sub'}`}>
                    {ok ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                    {rule.label}
                    <span className="sr-only">{ok ? '(충족)' : '(미충족)'}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Input
            label="비밀번호 확인"
            name="passwordConfirm"
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={form.passwordConfirm}
            onChange={set('passwordConfirm')}
            required
            error={errors.passwordConfirm}
          />

          <Input
            label="닉네임"
            name="nickname"
            id="nickname"
            placeholder="2~20자"
            maxLength={20}
            value={form.nickname}
            onChange={set('nickname')}
            required
            helperText="다른 사용자에게는 보이지 않고, 마이페이지에서 바꿀 수 있어요."
            error={errors.nickname}
          />

          <Button type="submit" disabled={submitting} aria-busy={submitting} className="w-full">
            {submitting ? '가입하는 중…' : '가입하기'}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-sub">
        이미 회원이신가요?{' '}
        <Link to={loginLink} className="font-medium text-primary underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
