import { describe, expect, it } from 'vitest';
import { loginPathFor, safeRedirectPath, validateLogin, validateProfileEdit, validateSignup } from './authValidation.js';

const ok = { email: 'a@school.ac.kr', password: 'abcd1234', passwordConfirm: 'abcd1234', nickname: '새내기' };

describe('validateSignup', () => {
  it('올바른 입력은 통과', () => {
    expect(validateSignup(ok)).toEqual({});
  });

  it('비밀번호 규칙(8자·영문·숫자)', () => {
    expect(validateSignup({ ...ok, password: 'abcdefgh', passwordConfirm: 'abcdefgh' }).password).toContain('숫자 포함');
    expect(validateSignup({ ...ok, password: '12345678', passwordConfirm: '12345678' }).password).toContain('영문 포함');
    expect(validateSignup({ ...ok, password: 'ab12', passwordConfirm: 'ab12' }).password).toContain('8자 이상');
  });

  it('비밀번호 확인 불일치, 이메일 형식, 닉네임 길이', () => {
    const e = validateSignup({ email: 'abc', password: 'abcd1234', passwordConfirm: 'abcd9999', nickname: 'a' });
    expect(Object.keys(e)).toEqual(['email', 'passwordConfirm', 'nickname']);
  });
});

describe('validateLogin', () => {
  it('빈 값', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' }))).toEqual(['email', 'password']);
  });
});

describe('로그인 후 돌아갈 주소', () => {
  it('앱 안의 경로만 허용', () => {
    expect(safeRedirectPath('/report-found')).toBe('/report-found');
    expect(safeRedirectPath('/items?keyword=a')).toBe('/items?keyword=a');
    expect(safeRedirectPath('https://evil.example')).toBe('/');
    expect(safeRedirectPath('//evil.example')).toBe('/');
    expect(safeRedirectPath('/\\evil.example')).toBe('/');
    expect(safeRedirectPath('/login')).toBe('/');
    expect(safeRedirectPath(null)).toBe('/');
  });

  it('현재 위치를 redirect 쿼리로', () => {
    expect(loginPathFor({ pathname: '/return-request/3', search: '?a=1' })).toBe('/login?redirect=%2Freturn-request%2F3%3Fa%3D1');
  });
});

describe('회원 정보 수정 검증', () => {
  const original = { nickname: '시연사용자1' };

  it('닉네임만 바꾸면 비밀번호는 보내지 않는다', () => {
    const { errors, patch } = validateProfileEdit({ nickname: ' 새이름 ', currentPassword: '', newPassword: '', newPasswordConfirm: '' }, original);
    expect(errors).toEqual({});
    expect(patch).toEqual({ nickname: '새이름' });
  });

  it('바뀐 것이 없으면 patch는 null', () => {
    const { patch } = validateProfileEdit({ nickname: '시연사용자1', currentPassword: '', newPassword: '', newPasswordConfirm: '' }, original);
    expect(patch).toBeNull();
  });

  it('비밀번호 변경은 현재 비밀번호·조건·확인을 검사', () => {
    const { errors } = validateProfileEdit({ nickname: '시연사용자1', currentPassword: '', newPassword: 'abc', newPasswordConfirm: 'abd' }, original);
    expect(Object.keys(errors)).toEqual(['currentPassword', 'newPassword', 'newPasswordConfirm']);
  });
});
