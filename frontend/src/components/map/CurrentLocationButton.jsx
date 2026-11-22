import { useState } from 'react';
import { LocateFixed } from 'lucide-react';

const MESSAGES = {
  unsupported: '이 브라우저는 현재 위치 기능을 지원하지 않아요.',
  denied: '위치 권한이 거부되어 현재 위치를 쓸 수 없어요. 지도와 건물 선택은 그대로 이용할 수 있어요.',
  unavailable: '현재 위치를 찾지 못했어요. 잠시 후 다시 시도하거나 건물을 선택해 주세요.',
  timeout: '현재 위치를 찾는 데 시간이 너무 오래 걸려요. 다시 시도하거나 건물을 선택해 주세요.',
};

/**
 * 현재 위치 버튼. 권한이 거부되거나 실패해도 지도는 계속 쓸 수 있게 메시지만 보여준다.
 * (위치 기능은 https 또는 localhost에서만 동작한다)
 */
export default function CurrentLocationButton({ onLocate, label = '현재 위치', className = '' }) {
  const [status, setStatus] = useState('idle'); // idle | locating | error
  const [message, setMessage] = useState('');

  const locate = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage(MESSAGES.unsupported);
      return;
    }
    setStatus('locating');
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('idle');
        onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      (err) => {
        setStatus('error');
        if (err.code === 1) setMessage(MESSAGES.denied);
        else if (err.code === 3) setMessage(MESSAGES.timeout);
        else setMessage(MESSAGES.unavailable);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={locate}
        disabled={status === 'locating'}
        aria-busy={status === 'locating'}
        className="inline-flex min-h-[44px] items-center gap-2 rounded border border-gray-300 bg-white px-3 text-sm font-medium text-text shadow-sm hover:border-primary disabled:opacity-60"
      >
        <LocateFixed size={18} aria-hidden="true" />
        {status === 'locating' ? '위치 찾는 중…' : label}
      </button>
      {message && (
        <p role="status" className="mt-1 max-w-xs rounded bg-white/95 p-2 text-xs text-error shadow">
          {message}
        </p>
      )}
    </div>
  );
}
