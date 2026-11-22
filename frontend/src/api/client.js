import axios from 'axios';
import { UNAUTHORIZED_EVENT, clearToken, getToken } from '../utils/authStorage.js';

// Content-Type은 지정하지 않는다. 객체는 axios가 JSON으로, FormData는 브라우저가
// boundary를 포함한 multipart/form-data로 자동 설정한다.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 20000,
});

// 로그인했으면 모든 요청에 토큰을 붙인다
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // 로그인 실패(401)는 화면에서 처리한다. 그 밖의 401은 토큰이 만료·무효라는 뜻이다.
    if (status === 401 && !url.startsWith('/auth/') && getToken()) {
      clearToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

/**
 * API 오류를 화면에 보여줄 형태로 바꾼다.
 * @returns {{ message: string, fieldErrors: Record<string, string>, status?: number }}
 */
export function toUserError(error, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.') {
  if (!error?.response && !error?.request) {
    // 네트워크 오류가 아닌 코드상의 오류
    return { message: fallback, fieldErrors: {} };
  }
  if (!error.response) {
    return {
      message: '서버에 연결할 수 없습니다. 인터넷 연결이나 서버 실행 상태를 확인해 주세요.',
      fieldErrors: {},
    };
  }
  const { status } = error.response;
  // 개발 서버 프록시는 백엔드가 꺼져 있으면 502~504를 돌려준다
  if (status >= 502 && status <= 504) {
    return { message: '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.', fieldErrors: {}, status };
  }
  if (status === 413) {
    return {
      message: '사진 용량이 너무 큽니다. 한 장에 5MB 이하로 올려 주세요.',
      fieldErrors: { images: '사진 용량을 확인해 주세요.' },
      status,
    };
  }
  const body = typeof error.response.data === 'object' && error.response.data ? error.response.data : {};
  return {
    message: body.message || fallback,
    fieldErrors: body.fieldErrors || {},
    status,
  };
}

export default client;
