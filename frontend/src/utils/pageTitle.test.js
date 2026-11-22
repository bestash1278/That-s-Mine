import { describe, expect, it } from 'vitest';
import { pageTitle } from './pageTitle.js';

describe('pageTitle', () => {
  it('화면마다 다른 제목을 만든다', () => {
    expect(pageTitle('/')).toBe("홈 · That's Mine");
    expect(pageTitle('/items')).toBe("분실물 조회 · That's Mine");
    expect(pageTitle('/items/12')).toBe("물품 상세 · That's Mine");
    expect(pageTitle('/mypage/lost-reports/3/edit')).toBe("분실 신고 수정 · That's Mine");
    expect(pageTitle('/admin')).toBe("관리자 페이지 · That's Mine");
  });

  it('없는 주소는 찾을 수 없다는 제목', () => {
    expect(pageTitle('/nothing')).toBe("페이지를 찾을 수 없습니다 · That's Mine");
  });
});
