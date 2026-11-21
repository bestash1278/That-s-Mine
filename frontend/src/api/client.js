import axios from 'axios';

const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // JWT 토큰 만료 시 처리 (추후 로그인 페이지로 리다이렉트)
      console.warn('인증 토큰이 만료되었습니다.');
    }
    return Promise.reject(error);
  }
);

export default client;
