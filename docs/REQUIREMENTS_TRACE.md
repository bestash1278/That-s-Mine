# 기획 ↔ 구현 대조표 (REQUIREMENTS_TRACE)

작성: 2026-11-22 (12단계). 기획 문서와 `docs/SPEC.md`에서 요구사항을 뽑아 최종 구현과 맞춰 본 표다.

- **상태 기준**: `구현` = 코드가 있고 자동 테스트나 실제 브라우저 점검을 통과함 / `부분 구현` = 일부만 되거나 확인하지 못한 부분이 있음 / `미구현` = 없음. 부분 구현·미구현은 이유를 적었다.
- 기획 문서의 수치·발화는 **가상 사례 기반 초안**이다. 실제 사용자 조사나 사용성 테스트는 수행하지 않았고, 아래의 "구현"은 사용자에게 효과가 있다는 뜻이 아니다.
- 점검 근거는 `docs/TEST_RESULTS.md`(명령과 개수), `docs/VERIFICATION_CHECKLIST.md`(SPEC §27 20항목)에 있다.
- 경로는 `frontend/src/…`, `backend/src/main/java/com/thatsmine/…`를 줄여 쓴다(F: 프론트, B: 백엔드).

## 1. 기획 문서의 요구사항

| 요구사항 | 근거 문서·절 | 구현 화면(경로) | 주요 파일 | 상태 |
|---|---|---|---|---|
| 여러 게시판 없이 물품명·분류·날짜·장소로 한곳에서 조회한다 | 제안서 §3·§4, 06 §7 우선순위 1, I01 | `/`, `/items` | F: `pages/ItemsPage.jsx`, `hooks/useItemSearch.js`, `utils/queryParser.js` / B: `service/FoundItemService.java`, `repository/FoundItemRepository.java` | 구현 |
| 검색어 표현 차이(이어폰↔에어팟)를 흡수한다 | 05 M05, CLAUDE 원칙 6 | `/items`, 분실 신고 추천 | B: `service/SearchSynonymService.java`, `service/MatchScorer.java`, 사전 `db/migration/V1·V2` | 부분 구현: 사전 항목이 20여 개(V1·V2 시드)뿐이라 없는 표현은 못 잡는다. 관리자가 사전을 편집하는 화면은 없다 |
| 사진·특징·발견 날짜·장소로 물품을 구별한다 | 06 §7 우선순위 2, I02 | `/items/:id`, 목록·추천 카드 | F: `pages/ItemDetailPage.jsx`(사진 갤러리·등록일), `components/common/ItemCard.jsx` | 구현 |
| 발견 위치를 지도로 확인한다 | 06 I02 설계 의미(지도는 설계안), SPEC §9 | `/items/:id`, `/map` | F: `components/map/ItemLocationMap.jsx`, `pages/MapPage.jsx`, `components/map/CampusMap.jsx` | 부분 구현: 지도 코드와 키 없는 대체 화면은 있으나 **실제 Kakao 지도 렌더링은 키가 없어 확인하지 못했다** |
| 보관 장소 다음에 "어떻게 찾아가나"(문의처·운영 시간·준비물·담당자 확인)를 보여준다 | I03, UI방법론 프레임 3, CLAUDE 원칙 3 | `/items/:id`(찾아가는 방법), 반환 신청 완료 화면 | F: `ItemDetailPage.jsx`, `pages/ReturnRequestPage.jsx` / B: `dto/StorageInfoDTO.java` | 구현 |
| 검색 결과가 없으면 조건 변경·분실 신고로 잇고 입력한 조건을 신고 폼에 채운다 | I03, C03, CLAUDE 원칙 5 | `/items` 결과 없음 → `/report-lost?keyword=…` | F: `ItemsPage.jsx`, `components/common/EmptyState.jsx`, `pages/ReportLostPage.jsx`, `utils/lostReportForm.js` | 구현 |
| 발견 위치와 현재 보관 위치를 혼동시키지 않는다 | 연구계획 §9(위험), CLAUDE 원칙 2 | 상세, 카드, 지도 범례 | F: `components/common/LocationCard.jsx`(빨강 MapPin·"발견한 곳" / 파랑 Archive·"지금 보관 중인 곳"), `ItemCard.jsx`, `components/map/MapLegend.jsx` | 구현(화면 구분). 실제로 혼동하는지는 사용성 테스트로 확인할 위험이며 미확인 |
| 목록 카드는 정보 위치를 고정한다 | 인터랙션분석 문제 1, CLAUDE 원칙 7 | 조회·홈·추천 카드 | F: `components/common/ItemCard.jsx` | 구현 |
| 소유자만 아는 특징·이름·학번·연락처는 공개하지 않는다 | UI방법론 개인 비판 검토, 제안서 위험표, CLAUDE 원칙 4 | 상세, 목록, 추천 | B: `dto/PublicFoundItemDTO.java`(비공개 필드 없음), `AdminFoundItemDTO.java`·`dto/returns/AdminReturnRequestDTO.java`(관리자 전용) | 구현 |
| 조회 결과는 소유권 증명이 아니다(수령 시 담당자 확인), 자동 소유 판정은 하지 않는다 | 제안서 §4 제외 범위, CLAUDE 원칙 9 | 상세, 반환 신청, 추천 | F: `ItemDetailPage.jsx`, `ReturnRequestPage.jsx`, `components/lost-report/MatchList.jsx` | 구현 |
| 모바일 우선(공강 10분, 스마트폰) | UI방법론, 05 §1, CLAUDE 원칙 8 | 전체 | F: `components/layout/MobileNav.jsx`, `Header.jsx`, 반응형 클래스, `ItemsPage.jsx`(모바일 상세 조건 접기) | 구현(375·768·1280px 점검 66회, `scripts/browser/audit.mjs`) |
| 과업 A: 도서관 파란색 파우치를 찾아 맞는 물건과 보관 장소를 답한다(3분) | 연구계획 §5·§7, 제안서 §5 | `/` → `/items?keyword=` → `/items/:id` | 시드 `config/DemoDataSeeder.java`(정답·오답 후보·반환 완료 동명 물품) | 구현(자동화된 브라우저로 수행 확인). **사람 대상 시험·3분 달성 여부는 확인하지 않았다** |
| 과업 B: 학생회관에서 주운 검은색 우산을 날짜·장소·종류·특징으로 신고해 완료 화면까지 간다(5분) | 연구계획 §5·§7 | `/report-found` → 확인 → `/report-found/complete/:id` | F: `ReportFoundPage.jsx`, `ReportFoundPreviewPage.jsx`, `ReportFoundCompletePage.jsx` / 예시 사진 `frontend/public/demo-photos/` | 구현(위와 같음) |
| 5명이 같은 초기 상태에서 시작하도록 dev 전용 시연 데이터 초기화를 제공한다 | CLAUDE 평가 과업 | API `POST /api/v1/dev/reset-demo`(ADMIN, dev 프로필) | B: `controller/DevController.java`, `service/DemoResetService.java`, `config/DemoDataSeeder.java` | 부분 구현: **API만 있고 화면 버튼은 없다**. 초기화 후 같은 초기 상태가 재현되는지는 확인했다 |
| 지도와 Kakao 키 없이도 핵심 과업이 끝까지 된다 | 06 §3, CLAUDE 원칙 1 | 전체 | F: `hooks/useKakaoLoader.js`, `components/map/MapLocationPicker.jsx`("시연용 위치 선택") | 구현(키 없는 상태에서 과업 A·B 완료 확인) |
| 제외 범위(학교 시스템 연동, 소유자 자동 판정, 배송, 푸시·이메일 알림) | 제안서 §4 | — | — | 미구현(의도한 제외). 임의로 추가하지 않았다 |

## 2. SPEC 기능 요구사항

| SPEC | 요구사항 | 구현 화면(경로) | 주요 파일 | 상태 |
|---|---|---|---|---|
| §5 | 색상 토큰, 카드형 UI, 공통 컴포넌트, 상태는 색+글자, 로딩·오류·결과 없음·완료 상태 | 전체 | F: `tailwind.config.js`, `components/common/*`, `constants/status.js` | 구현(대비 4.5:1·터치 44px·입력 16px 점검, `docs/PROGRESS.md` 12단계) |
| §6 | 헤더(PC)·하단 메뉴(모바일), 현재 메뉴 표시, 로그인 상태별 메뉴 | 전체 | F: `components/layout/Header.jsx`, `MobileNav.jsx` | 구현 |
| §7 | 메인: 검색 영역, 빠른 기능 4개, 카테고리, 최근 습득물 | `/` | F: `pages/HomePage.jsx` | 구현 |
| §8 | 조회: 키워드·카테고리·발견 장소·날짜·상태 조건, 정렬 4종, 목록↔지도 전환 시 조건 유지, 결과 수·서버 페이지네이션, 결과 없음 | `/items` | F: `ItemsPage.jsx`, `useItemSearch.js` / B: `FoundItemController.java`(`GET /found-items`) | 구현. 별도 "물품 특징" 조건 칸은 없고 검색어가 이름·특징을 함께 찾는다 |
| §9 | 지도: 이동·확대, 현재 위치, 4색 마커(발견·보관·분실·반환 완료), 위치 유형 선택, 클러스터링, 마커 팝업, 이 지역에서 다시 검색, PC 2열·모바일 상하 | `/map` | F: `pages/MapPage.jsx`, `components/map/*` / B: `GET /found-items/map`, `GET /lost-reports/map` | 부분 구현: 지도 영역 API·대체 화면은 자동 테스트와 브라우저로 확인. **마커·클러스터·드래그·현재 위치 등 SDK 동작은 키가 없어 확인하지 못했다** |
| §10 | 습득물 신고: 입력 구역, 오늘 기본값·미래 제한, 사진 3장·5MB·형식·삭제·대표 선택·드래그·카메라, 보관 정보 3가지, 미리보기, 서버 성공 시에만 완료 | `/report-found` 흐름 | F: `ReportFoundPage.jsx`, `components/common/FileUploadPreview.jsx`, `contexts/ReportFoundDraftContext.jsx` / B: `FoundItemService.createFoundItem`, `ImageStorageService` | 구현(지도 위치 선택 부분은 위 §9와 같은 한계) |
| §11 | 분실 신고: 날짜 또는 기간, 대표 추정 위치 + 추가 설명, 지도 선택, 사진, 본인 수정·삭제 | `/report-lost`, `/mypage/lost-reports/:id/edit` | F: `ReportLostPage.jsx`, `components/lost-report/LostReportForm.jsx` / B: `LostReportService.java` | 구현 |
| §12 | 상세: 대표·추가 사진, 등록 날짜, 발견/보관 위치 구분, 보관 장소 확인 중 표시, 반환 신청, 목록으로(조건 유지), 반환 완료 시 신청 막기 | `/items/:id` | F: `ItemDetailPage.jsx` | 부분 구현: 반환 완료 물품은 "반환 신청 버튼을 비활성화"가 아니라 **버튼 대신 안내 문구**로 바꿨다 |
| §13 | 회원가입(중복·비밀번호 검사)·로그인(JWT, BCrypt)·로그아웃, 비회원 조회, 로그인 후 원래 화면 복귀 | `/signup`, `/login` | F: `contexts/AuthContext.jsx`, `components/auth/ProtectedRoute.jsx` / B: `AuthService.java`, `security/*` | 부분 구현: 로그아웃은 토큰을 지우는 방식이라 **서버에서 토큰을 무효화하지 않는다**(24시간 유효). 로그인 시도 횟수 제한 없음 |
| §14 | 마이페이지: 회원 정보 수정, 내 습득물·분실 신고·반환 신청, 상태별 수정·삭제 제한 | `/mypage?tab=` | F: `pages/MyPage.jsx`, `components/mypage/*` / B: `EditPolicy.java`, `UserController.java` | 구현 |
| §15 | 반환 신청: 소유 확인 특징, 상태 5종, 승인과 완료 구분, 중복 반환 방지(트랜잭션·동시성) | `/return-request/:id`, `/admin` | F: `ReturnRequestPage.jsx`, `components/admin/AdminReturnRequests.jsx` / B: `ReturnRequestService.java`, `ReturnPolicy.java` | 구현(MySQL에서 동시 신청·승인 점검 통과, 91개 스크립트) |
| §16 | 관리자: 전체 습득물·분실 신고 조회, 숨김, 정보·발견 위치 수정, 보관 위치 지정, 반환 처리, 상태 변경, 건물·보관 장소 관리 | `/admin`(탭 4개) | F: `pages/AdminPage.jsx`, `components/admin/*` / B: `AdminController.java`, `AdminService.java` | 부분 구현: **관리자가 분실 신고의 상태를 바꾸는 기능은 없다**(조회만, 상태 변경은 본인 권한). 습득물의 제목·특징 같은 "잘못 등록된 정보" 전반의 수정은 발견 위치와 보관 위치만 가능하다. 건물 삭제는 SPEC API 목록에 없어 없다 |
| §17 | 유사 물품 추천: 규칙 점수 30/30/25/15, 반환 완료 제외, 소유 확정 아님 명시 | `/report-lost/complete/:id`, `/lost-reports/:id`, `/mypage?tab=lost` | B: `MatchScorer.java`, `MatchService.java` / F: `MatchList.jsx` | 구현. **점수의 정확도(실제로 맞는 물건을 잘 찾는지)는 검증하지 않았다** |
| §18·§19 | DB 설계와 상태값(프론트·백엔드 문자열 일치) | — | B: `db/migration/V1~V4`, `enums/*` / F: `constants/status.js` | 구현(SPEC §18 대비 추가 컬럼은 `docs/ERD.md`에 기록) |
| §20 | REST API(`/api/v1`) | — | B: `controller/*` | 구현. 추가 경로 5개(아래 §3) |
| §23 | 보안: BCrypt, 서버 JWT 검증, 작성자·관리자만 수정, 환경변수, `.gitignore`·`.env.example`, 파일명·이미지 검증, 좌표 검증, 중복 제출 방지, 오류 메시지, 요청 중 버튼 비활성, 키 없어도 앱 실행 | 전체 | B: `SecurityConfig.java`, `ImageStorageService.java`, `GlobalExceptionHandler.java` | 부분 구현: **중복 제출은 화면(버튼 비활성·재진입 방지)에서만 막고 서버가 같은 내용의 두 요청을 한 건으로 합치지는 않는다**. 반환 신청의 중복은 서버가 막는다 |
| §24 | 일관성·가시성·피드백·오류 예방·사용자 제어·인지 부담 감소 | 전체 | — | 구현(점검 항목은 `docs/PROGRESS.md` 12단계). 사용성 목표 수치(5명 중 4명)는 설계 목표이며 **측정하지 않았다** |
| §25 | 시연 데이터 10종 + 평가용 + 여러 상태, 개인정보 없음, dev 전용 계정 | dev 프로필 | B: `config/DemoDataSeeder.java`, `DataInitializer.java` | 구현 |
| §27 | 검증 20항목 | — | — | 항목별 근거와 한계는 `docs/VERIFICATION_CHECKLIST.md` |
| §28 | 최종 산출물(코드, 마이그레이션, 시연 데이터, `.env.example`, README, API·ERD 문서, 실행·지도·계정 안내, 테스트 결과) | — | `README.md`, `docs/API.md`, `docs/ERD.md`, `docs/TEST_RESULTS.md` | 구현 |

## 3. SPEC §20 대비 추가·변경한 API

| 경로 | 이유 |
|---|---|
| `GET /found-items/{id}/return-requests/me` | 상세 화면에서 신청 가능 여부와 막는 이유를 보여주려고 추가 |
| `PATCH /admin/found-items/{id}/found-location` | SPEC §16 "발견 위치 수정"을 위해 추가 |
| `GET /admin/storage-locations` | 사용 중지된 보관 장소까지 관리하려고 추가 |
| `GET /users/me/found-items/{id}` | 내 습득물 수정 화면에 비공개 특징을 주려고 추가(본인만) |
| `PATCH /lost-reports/{id}/status` | 찾는 중 ↔ 찾기 완료 ↔ 신고 종료 변경 |
| `GET /auth/check-email` | 가입 화면의 이메일 중복 확인 |
| `POST /dev/reset-demo` | 평가 과업용 초기화(dev 프로필, ADMIN) |
| `PATCH /admin/lost-reports/{id}/status` | SPEC §16 "신고 상태 변경"(분실 신고) |

## 4. 구현하지 않았거나 확인하지 못한 것 요약

1. 실제 Kakao 지도 렌더링과 SDK 동작(키 없음)
2. 사용성 테스트(사람 대상 과업 A·B, 성공률, 소요 시간) — 점검은 자동화된 브라우저로만 했다
3. 로그인 시도 제한(요구사항에 없음)
4. 습득물 전반의 정보 수정(관리자는 발견·보관 위치만)
5. 서버가 여러 대일 때의 중복 제출 방지(지금은 서버 한 대 기준)
6. 시연 데이터 초기화 화면 버튼
7. 알림(푸시·이메일), 학교 시스템 연동, 자동 소유 판정, 배송 — 제외 범위
8. 추천 점수의 정확도 검증, 동의어 사전 편집 화면
