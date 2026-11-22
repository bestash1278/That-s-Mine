// SPEC §7 카테고리. 백엔드 Flyway V2와 ID·이름이 같아야 한다.
// 화면은 가능하면 GET /api/v1/categories 결과를 쓰고, 이 목록은 서버 응답이 없을 때의 대체용이다.
export const CATEGORIES = [
  { id: 1, name: '전자기기' },
  { id: 2, name: '지갑·카드' },
  { id: 3, name: '열쇠' },
  { id: 4, name: '의류·잡화' },
  { id: 5, name: '도서·문구' },
  { id: 6, name: '기타' },
];

export const getCategoryName = (categoryId) => {
  const id = Number(categoryId);
  const category = CATEGORIES.find((c) => c.id === id);
  return category?.name || '기타';
};

// 이전 버전 호환용(아이콘은 장식이라 쓰지 않는다)
export const getCategoryIcon = () => '';
