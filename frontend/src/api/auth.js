import client from './client.js';

/** @returns {Promise<{ accessToken, tokenType, expiresIn, user }>} */
export async function signup({ email, password, passwordConfirm, nickname }) {
  const res = await client.post('/auth/signup', { email: email.trim(), password, passwordConfirm, nickname: nickname.trim() });
  return res.data?.data;
}

export async function login({ email, password }) {
  const res = await client.post('/auth/login', { email: email.trim(), password });
  return res.data?.data;
}

export async function logout() {
  try {
    await client.post('/auth/logout');
  } catch {
    // 토큰을 지우면 로그아웃이므로 서버 응답 실패는 무시
  }
}

export async function checkEmailAvailable(email) {
  const res = await client.get('/auth/check-email', { params: { email: email.trim() } });
  return Boolean(res.data?.data?.available);
}

export async function getMe() {
  const res = await client.get('/users/me');
  return res.data?.data;
}

export async function updateMe(patch) {
  const res = await client.patch('/users/me', patch);
  return res.data?.data;
}
