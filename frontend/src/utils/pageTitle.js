// 화면마다 브라우저 탭·스크린리더가 읽는 문서 제목을 다르게 한다(이동했을 때 어디인지 알 수 있게).
const ROUTES = [
  [/^\/$/, '홈'],
  [/^\/items\/\d+$/, '물품 상세'],
  [/^\/items$/, '분실물 조회'],
  [/^\/map$/, '지도 조회'],
  [/^\/login$/, '로그인'],
  [/^\/signup$/, '회원가입'],
  [/^\/report-found\/preview$/, '습득물 신고 확인'],
  [/^\/report-found\/complete\/\d+$/, '습득물 신고 완료'],
  [/^\/report-found$/, '습득물 신고'],
  [/^\/report-lost\/complete\/\d+$/, '분실 신고 완료'],
  [/^\/report-lost$/, '분실 신고'],
  [/^\/lost-reports\/\d+$/, '분실 신고 상세'],
  [/^\/mypage\/found-items\/\d+\/edit$/, '습득물 수정'],
  [/^\/mypage\/lost-reports\/\d+\/edit$/, '분실 신고 수정'],
  [/^\/mypage$/, '마이페이지'],
  [/^\/return-request\/\d+$/, '반환 신청'],
  [/^\/admin$/, '관리자 페이지'],
];

export const APP_NAME = "That's Mine";

export function pageTitle(pathname) {
  const found = ROUTES.find(([pattern]) => pattern.test(pathname));
  return found ? `${found[1]} · ${APP_NAME}` : `페이지를 찾을 수 없습니다 · ${APP_NAME}`;
}
