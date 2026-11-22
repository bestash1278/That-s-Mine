// 회원가입·로그인 입력 검증. 백엔드(SignupRequest, PasswordRules)와 같은 규칙.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULES = [
  { key: 'length', label: '8자 이상 64자 이하', test: (pw) => pw.length >= 8 && pw.length <= 64 },
  { key: 'letter', label: '영문 포함', test: (pw) => /[A-Za-z]/.test(pw) },
  { key: 'digit', label: '숫자 포함', test: (pw) => /\d/.test(pw) },
];

export function isValidEmail(email) {
  return EMAIL_RE.test((email || '').trim());
}

export function validateLogin({ email, password }) {
  const e = {};
  if (!email.trim()) e.email = '이메일을 입력해 주세요.';
  else if (!isValidEmail(email)) e.email = '이메일 형식이 올바르지 않습니다.';
  if (!password) e.password = '비밀번호를 입력해 주세요.';
  return e;
}

export function validateSignup({ email, password, passwordConfirm, nickname }) {
  const e = {};
  if (!email.trim()) e.email = '이메일을 입력해 주세요.';
  else if (!isValidEmail(email)) e.email = '이메일 형식이 올바르지 않습니다.';
  else if (email.trim().length > 100) e.email = '이메일은 100자 이하로 입력해 주세요.';

  if (!password) e.password = '비밀번호를 입력해 주세요.';
  else {
    const failed = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failed.length > 0) e.password = `비밀번호 조건을 확인해 주세요: ${failed.map((r) => r.label).join(', ')}`;
  }

  if (!passwordConfirm) e.passwordConfirm = '비밀번호를 한 번 더 입력해 주세요.';
  else if (password !== passwordConfirm) e.passwordConfirm = '비밀번호가 서로 다릅니다.';

  const nick = nickname.trim();
  if (!nick) e.nickname = '닉네임을 입력해 주세요.';
  else if (nick.length < 2 || nick.length > 20) e.nickname = '닉네임은 2자 이상 20자 이하로 입력해 주세요.';
  return e;
}

/**
 * 로그인 후 돌아갈 주소. 다른 사이트로 보내는 주소(//evil.com, https://...)는 막는다.
 */
export function safeRedirectPath(value, fallback = '/') {
  if (!value || typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/signup')) return fallback;
  return value;
}

/** 현재 위치를 로그인 화면으로 넘길 때 쓰는 주소 */
export function loginPathFor(location) {
  const from = `${location.pathname}${location.search || ''}`;
  return `/login?redirect=${encodeURIComponent(from)}`;
}

/**
 * 마이페이지 회원 정보 수정 검증. 비밀번호 칸이 모두 비어 있으면 비밀번호는 바꾸지 않는다.
 * @returns {{ errors: Record<string,string>, patch: object|null }} 바뀐 것이 없으면 patch는 null
 */
export function validateProfileEdit({ nickname, currentPassword, newPassword, newPasswordConfirm }, original) {
  const e = {};
  const nick = (nickname || '').trim();
  if (!nick) e.nickname = '닉네임을 입력해 주세요.';
  else if (nick.length < 2 || nick.length > 20) e.nickname = '닉네임은 2자 이상 20자 이하로 입력해 주세요.';

  const changingPassword = Boolean(currentPassword || newPassword || newPasswordConfirm);
  if (changingPassword) {
    if (!currentPassword) e.currentPassword = '현재 비밀번호를 입력해 주세요.';
    if (!newPassword) e.newPassword = '새 비밀번호를 입력해 주세요.';
    else {
      const failed = PASSWORD_RULES.filter((r) => !r.test(newPassword));
      if (failed.length > 0) e.newPassword = `비밀번호 조건을 확인해 주세요: ${failed.map((r) => r.label).join(', ')}`;
    }
    if (newPassword && newPassword !== newPasswordConfirm) e.newPasswordConfirm = '새 비밀번호가 서로 다릅니다.';
  }

  const patch = {};
  if (nick && nick !== original?.nickname) patch.nickname = nick;
  if (changingPassword) Object.assign(patch, { currentPassword, newPassword });
  return { errors: e, patch: Object.keys(patch).length ? patch : null };
}
