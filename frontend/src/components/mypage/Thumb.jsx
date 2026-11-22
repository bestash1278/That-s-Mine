import { ImageOff } from 'lucide-react';

export default function Thumb({ url }) {
  return (
    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-gray-100">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sub">
          <ImageOff size={20} aria-hidden="true" />
          <span className="sr-only">사진 없음</span>
        </div>
      )}
    </div>
  );
}
