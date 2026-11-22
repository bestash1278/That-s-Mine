import { useEffect, useState } from 'react';
import { KAKAO_MAP_KEY } from '../constants/map.js';

const LOAD_TIMEOUT_MS = 10000;
let loadPromise = null;

/**
 * Kakao Maps JavaScript SDK를 한 번만 동적으로 불러온다.
 * 키가 없거나 불러오지 못해도 앱 전체는 정상 동작해야 하므로 예외를 밖으로 던지지 않고 상태로 알린다.
 */
export function loadKakaoMaps(appKey = KAKAO_MAP_KEY) {
  if (typeof window === 'undefined') return Promise.reject(new Error('브라우저가 아닙니다.'));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=clusterer`;
    script.async = true;

    const fail = (reason) => {
      clearTimeout(timer);
      script.remove();
      loadPromise = null; // 다음에 다시 시도할 수 있게
      reject(new Error(reason));
    };
    // 키가 틀리면 load 콜백이 오지 않을 수 있어 시간 제한을 둔다
    const timer = setTimeout(() => fail('timeout'), LOAD_TIMEOUT_MS);

    script.onload = () => {
      if (!window.kakao?.maps?.load) {
        fail('sdk-invalid');
        return;
      }
      window.kakao.maps.load(() => {
        clearTimeout(timer);
        resolve(window.kakao);
      });
    };
    script.onerror = () => fail('network');
    document.head.appendChild(script);
  });
  return loadPromise;
}

/**
 * @returns {{ status: 'no-key' | 'loading' | 'ready' | 'error', kakao: any, retry: () => void }}
 */
export function useKakaoLoader() {
  const [state, setState] = useState(() => {
    if (!KAKAO_MAP_KEY) return { status: 'no-key', kakao: null };
    if (typeof window !== 'undefined' && window.kakao?.maps?.LatLng) return { status: 'ready', kakao: window.kakao };
    return { status: 'loading', kakao: null };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!KAKAO_MAP_KEY || state.status === 'ready') return undefined;
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (!cancelled) setState({ status: 'ready', kakao });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', kakao: null });
      });
    return () => {
      cancelled = true;
    };
    // state.status는 'ready'가 되면 다시 부르지 않기 위한 조건으로만 쓴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = () => {
    if (!KAKAO_MAP_KEY) return;
    setState({ status: 'loading', kakao: null });
    setAttempt((n) => n + 1);
  };

  return { ...state, retry };
}
