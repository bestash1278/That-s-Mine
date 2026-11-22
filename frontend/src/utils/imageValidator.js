export const IMAGE_CONSTRAINTS = {
  maxSize: 5 * 1024 * 1024, // 5MB
  formats: ['image/jpeg', 'image/png', 'image/webp'],
  extensions: ['jpg', 'jpeg', 'png', 'webp'],
  formatNames: ['JPG', 'PNG', 'WebP'],
  maxCount: 3,
};

/**
 * 브라우저에서 미리 거르는 1차 검사(형식·용량). 실제 파일 형식은 서버가 다시 확인한다.
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateImage(file) {
  if (!file) {
    return { valid: false, error: '파일을 선택해 주세요.' };
  }
  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  const typeOk = IMAGE_CONSTRAINTS.formats.includes(file.type);
  // 일부 기기는 type을 비워서 보내므로 확장자로 한 번 더 본다.
  const extOk = !file.type && IMAGE_CONSTRAINTS.extensions.includes(ext);
  if (!typeOk && !extOk) {
    return {
      valid: false,
      error: `${file.name}: ${IMAGE_CONSTRAINTS.formatNames.join(', ')} 사진만 올릴 수 있어요.`,
    };
  }
  if (file.size > IMAGE_CONSTRAINTS.maxSize) {
    return {
      valid: false,
      error: `${file.name}: 5MB 이하 사진만 올릴 수 있어요. (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }
  return { valid: true, error: null };
}

export function getImagePreview(file) {
  if (!file) return null;
  return URL.createObjectURL(file);
}

export function revokeImagePreview(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
