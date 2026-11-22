/**
 * 수정 화면의 사진 목록 다루기.
 * FileUploadPreview는 [{ id, file, url }] 목록을 그린다. 이미 저장된 사진은 file 없이
 * { id: 'saved:/uploads/..', url, savedUrl } 로 넣고, 새로 고른 사진은 file을 가진다.
 * 보낼 때는 남길 기존 사진(keepImageUrls)과 새 파일로 나누어 서버에 알린다.
 */

/** 서버의 사진 URL 목록(대표 사진이 맨 앞) → 화면용 사진 목록 */
export function photosFromUrls(urls = []) {
  return urls.map((url) => ({ id: `saved:${url}`, url, savedUrl: url }));
}

/**
 * @returns {{ keepImageUrls: string[], files: File[], representativeImageUrl: string|null, representativeImageIndex: number|null }}
 */
export function splitPhotos(photos, representativeId) {
  const saved = photos.filter((p) => p.savedUrl);
  const fresh = photos.filter((p) => !p.savedUrl && p.file);
  const rep = photos.find((p) => p.id === representativeId) || photos[0];
  return {
    keepImageUrls: saved.map((p) => p.savedUrl),
    files: fresh.map((p) => p.file),
    representativeImageUrl: rep?.savedUrl ?? null,
    representativeImageIndex: rep && !rep.savedUrl ? fresh.findIndex((p) => p.id === rep.id) : null,
  };
}
