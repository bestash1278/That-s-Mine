import { describe, expect, it } from 'vitest';
import { validateReturnForm } from './returnRequestForm.js';

describe('validateReturnForm', () => {
  it('소유 확인 특징이 비어 있으면 오류', () => {
    expect(validateReturnForm({ ownershipDescription: '   ', additionalNote: '' }).ownershipDescription).toMatch(/입력해 주세요/);
  });

  it('너무 짧으면 오류', () => {
    expect(validateReturnForm({ ownershipDescription: 'abc' }).ownershipDescription).toMatch(/5자 이상/);
  });

  it('너무 길면 오류', () => {
    expect(validateReturnForm({ ownershipDescription: 'a'.repeat(501) }).ownershipDescription).toMatch(/500자 이하/);
  });

  it('추가 설명은 선택이지만 길이는 제한한다', () => {
    expect(validateReturnForm({ ownershipDescription: '안쪽에 노란 스티커', additionalNote: '' })).toEqual({});
    expect(validateReturnForm({ ownershipDescription: '안쪽에 노란 스티커', additionalNote: 'a'.repeat(301) }).additionalNote).toMatch(/300자 이하/);
  });
});
