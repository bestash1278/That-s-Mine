// 로그인 토큰 보관. 브라우저 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 앱이 멈추지 않게 한다.
const KEY = 'thatsmine.accessToken';
let memoryToken = null;

export function getToken() {
  try {
    return window.localStorage.getItem(KEY) || memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setToken(token) {
  memoryToken = token;
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    // 메모리에만 보관(새로 고치면 다시 로그인)
  }
}

export function clearToken() {
  memoryToken = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

/** 401을 받았을 때 AuthContext에 알리는 이벤트 이름 */
export const UNAUTHORIZED_EVENT = 'thatsmine:unauthorized';
