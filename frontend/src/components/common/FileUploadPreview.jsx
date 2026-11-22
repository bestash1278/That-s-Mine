import { useId, useRef, useState } from 'react';
import { Camera, ImagePlus, Star, Trash2 } from 'lucide-react';
import { IMAGE_CONSTRAINTS, validateImage } from '../../utils/imageValidator.js';

/**
 * 사진 등록 (최대 3장, 장당 5MB, JPG/PNG/WebP)
 * - 드래그 앤 드롭, 갤러리 선택, 모바일 카메라 촬영
 * - 미리보기, 삭제, 대표 사진 선택 (모두 버튼이라 터치·키보드로 조작 가능)
 * - 잘못된 파일은 alert 대신 목록 아래에 이유를 보여준다
 *
 * @param photos [{ id, file, url }]
 * @param onAdd (files: File[]) => void   검사를 통과한 파일만 전달
 */
export default function FileUploadPreview({
  photos = [],
  representativeId,
  onAdd,
  onRemove,
  onSetRepresentative,
  error,
  maxFiles = IMAGE_CONSTRAINTS.maxCount,
}) {
  const baseId = useId();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState([]);

  const remaining = maxFiles - photos.length;
  const effectiveRepId = photos.some((p) => p.id === representativeId) ? representativeId : photos[0]?.id;

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const accepted = [];
    const messages = [];
    files.forEach((file) => {
      const check = validateImage(file);
      if (!check.valid) {
        messages.push(check.error);
      } else if (accepted.length >= remaining) {
        messages.push(`${file.name}: 사진은 최대 ${maxFiles}장까지 등록할 수 있어 제외했어요.`);
      } else {
        accepted.push(file);
      }
    });
    setRejected(messages);
    if (accepted.length > 0) onAdd(accepted);
  };

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    // 같은 파일을 지웠다가 다시 고를 수 있게 값을 비운다
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (remaining > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {remaining > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
            isDragging ? 'border-accent bg-blue-50' : 'border-gray-300 bg-white'
          }`}
        >
          <p className="font-medium text-text">사진을 끌어다 놓거나 아래 버튼으로 추가하세요</p>
          <p className="mt-1 text-sm text-sub">
            JPG·PNG·WebP · 한 장에 5MB 이하 · {photos.length}/{maxFiles}장
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border-2 border-primary px-4 text-primary hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <ImagePlus size={18} aria-hidden="true" /> 앨범에서 선택
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border-2 border-primary px-4 text-primary hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary sm:hidden"
            >
              <Camera size={18} aria-hidden="true" /> 카메라로 촬영
            </button>
          </div>
          {/* 갤러리용(capture 없음)과 카메라용(capture) 입력을 나눠야 모바일에서 둘 다 쓸 수 있다 */}
          <input
            ref={galleryRef}
            id={`${baseId}-gallery`}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            ref={cameraRef}
            id={`${baseId}-camera`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={onInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}

      {(rejected.length > 0 || error) && (
        <div role="alert" className="rounded border-l-4 border-error bg-red-50 p-3 text-sm text-error">
          {error && <p>{error}</p>}
          {rejected.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="등록한 사진">
          {photos.map((photo, index) => {
            const isRep = photo.id === effectiveRepId;
            return (
              <li key={photo.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="relative h-32 bg-gray-100 md:h-40">
                  <img src={photo.url} alt={`등록한 사진 ${index + 1}`} className="h-full w-full object-cover" />
                  {isRep && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-medium text-white">
                      <Star size={12} aria-hidden="true" /> 대표 사진
                    </span>
                  )}
                </div>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => onSetRepresentative(photo.id)}
                    disabled={isRep}
                    aria-pressed={isRep}
                    className="min-h-[44px] flex-1 text-sm text-primary hover:bg-blue-50 disabled:cursor-default disabled:text-sub disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  >
                    {isRep ? '대표 사진' : '대표로 지정'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(photo.id)}
                    aria-label={`사진 ${index + 1} 삭제`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border-l border-gray-200 text-error hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-error"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded bg-amber-50 p-3 text-sm text-amber-900">
        학생증·신분증·카드 번호·이름처럼 개인정보가 보이는 면은 찍지 마세요. 사진은 모든 사용자에게 공개됩니다.
      </div>
    </div>
  );
}
