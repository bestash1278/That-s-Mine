import { describe, expect, it } from 'vitest';
import { photosFromUrls, splitPhotos } from './editPhotos.js';

describe('수정 화면 사진 나누기', () => {
  const fileA = { name: 'a.jpg' };
  const fileB = { name: 'b.jpg' };

  it('저장된 사진은 keepImageUrls로, 새 사진은 files로 나눈다', () => {
    const photos = [...photosFromUrls(['/uploads/1.jpg']), { id: 'p1', file: fileA, url: 'blob:a' }];
    const result = splitPhotos(photos, 'saved:/uploads/1.jpg');
    expect(result.keepImageUrls).toEqual(['/uploads/1.jpg']);
    expect(result.files).toEqual([fileA]);
    expect(result.representativeImageUrl).toBe('/uploads/1.jpg');
    expect(result.representativeImageIndex).toBeNull();
  });

  it('새 사진을 대표로 고르면 새 사진 중 순번을 보낸다', () => {
    const photos = [
      ...photosFromUrls(['/uploads/1.jpg']),
      { id: 'p1', file: fileA, url: 'blob:a' },
      { id: 'p2', file: fileB, url: 'blob:b' },
    ];
    const result = splitPhotos(photos, 'p2');
    expect(result.representativeImageUrl).toBeNull();
    expect(result.representativeImageIndex).toBe(1);
  });

  it('저장된 사진을 모두 지우면 빈 keepImageUrls(서버에서 삭제)', () => {
    const result = splitPhotos([], null);
    expect(result.keepImageUrls).toEqual([]);
    expect(result.files).toEqual([]);
    expect(result.representativeImageUrl).toBeNull();
  });
});
