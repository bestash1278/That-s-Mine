import { describe, expect, it } from 'vitest';
import { validateImage } from './imageValidator.js';

const file = (name, type, size) => ({ name, type, size });

describe('validateImage', () => {
  it('JPG·PNG·WebP 5MB 이하는 통과', () => {
    expect(validateImage(file('a.jpg', 'image/jpeg', 1024)).valid).toBe(true);
    expect(validateImage(file('a.png', 'image/png', 5 * 1024 * 1024)).valid).toBe(true);
    expect(validateImage(file('a.webp', 'image/webp', 10)).valid).toBe(true);
  });

  it('형식이 다르면 거부', () => {
    const result = validateImage(file('a.gif', 'image/gif', 10));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('a.gif');
  });

  it('5MB 초과는 거부', () => {
    expect(validateImage(file('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)).valid).toBe(false);
  });

  it('type이 비어 있으면 확장자로 판단', () => {
    expect(validateImage(file('photo.JPG', '', 100)).valid).toBe(true);
    expect(validateImage(file('doc.pdf', '', 100)).valid).toBe(false);
  });
});
