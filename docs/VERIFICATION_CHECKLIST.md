# 검증 체크리스트 — SPEC §27 (20개 항목)

작성: 2026-11-22 (12단계). 항목마다 **어떤 방법으로 무엇을 확인했는지**, 확인하지 못한 부분, 수동으로 확인하는 절차를 적었다. 실행하지 않은 것을 통과로 쓰지 않았다.

방법 표기
- **JUnit**: `backend` 자동 테스트(H2 `test` 프로필). `gradlew.bat test`
- **MySQL 점검**: MySQL에 dev 프로필 서버를 띄우고 실제 HTTP 요청을 보내는 스크립트(`backend/scripts/`)
- **브라우저**: 헤드리스 Chrome(`scripts/browser/flows.mjs`, `audit.mjs`)으로 실제 화면을 조작·검사
- **Vitest**: 프론트 컴포넌트·로직 테스트. `npm test`

실행 환경과 개수는 `docs/TEST_RESULTS.md`의 12단계 항목에 있다.

| # | 검증 항목 | 확인한 방법과 내용 | 결과 | 확인하지 못한 것 · 수동 확인 절차 |
|---:|---|---|---|---|
| 1 | 회원가입 및 로그인 | JUnit `AuthApiTest`(가입·중복·검증·이메일 확인·로그인·내 정보·수정·삭제된 사용자 토큰·비회원 접근·관리자 전용). MySQL 점검(가입 시 role 요청 무시, 위조 토큰 401). 브라우저(비로그인 → 로그인 화면 → 로그인 후 원래 화면 복귀) | 통과 | 회원가입 **화면**의 입력 검증 표시는 Vitest/육안 수준. 절차: `/signup`에서 중복 이메일(`user1@demo.local`)과 비밀번호 조건을 입력해 안내 문구 확인 |
| 2 | 습득물 등록 | JUnit `FoundItemReportFlowTest`·`FoundItemControllerTest`. 브라우저 과업 B(입력 → 확인 화면 → 제출 → 완료 화면 → 조회에 나타남) | 통과 | — |
| 3 | 습득물 수정 및 삭제 | JUnit `MyPageApiTest`(수정·반환 진행 중 잠금·신청 접수 후 잠금·타인 403)·`EditPolicyTest`. MySQL 점검(신청 접수 후 삭제 409, 타인 삭제 403). 브라우저(수정 저장 → 목록에 반영, 삭제 → 조회에서 사라짐) | 통과 | 사진 교체가 있는 수정을 **실제 Tomcat(MySQL 점검)에서** multipart로 보내 본 것은 분실 신고뿐이다. 습득물 수정은 JUnit·브라우저(사진 없이 이름만 수정)로 확인. 절차: 마이페이지 → 습득물 → 수정에서 사진을 지우고 새로 추가한 뒤 저장 |
| 4 | 사진 업로드 | JUnit `ImageTypeDetectionTest`(JPEG·PNG·WebP 매직바이트)·`ImagePlanTest`·`FoundItemControllerTest.createWithImages`. 브라우저(사진 2장 선택 → 미리보기 → 업로드 → 상세 갤러리에서 두 장 확인) | 통과 | 5MB 초과 파일을 브라우저에서 올려 본 적은 없다(서버 `max-file-size`와 `MaxUploadSizeExceededException` 처리는 코드로만 확인) |
| 5 | 물품명 검색 | JUnit `FoundItemControllerTest.searchByKeyword`·`FoundItemSearchFilterTest`. MySQL 점검(동의어 "에어팟"→이어폰). 브라우저 과업 A | 통과 | — |
| 6 | 카테고리 필터링 | JUnit `FoundItemSearchFilterTest.categoryFilter`·`combinedFilters`. 홈의 카테고리 버튼 → 조회 이동 | 통과 | 홈의 카테고리 버튼 클릭은 브라우저로 자동 수행하지 않았다(주소 파라미터 방식은 JUnit로 확인). 절차: 홈 "카테고리로 찾기"에서 "전자기기" 클릭 → 목록이 전자기기만인지 |
| 7 | 날짜 필터링 | JUnit `FoundItemSearchFilterTest.dateRangeFilter`(시작·끝·둘 다), `LostReportApiTest.listDateOverlap`(분실 기간 겹침) | 통과 | 날짜 입력 UI 조작은 브라우저에서 하지 않았다. 절차: `/items`에서 "상세 조건 펼치기" → 발견 시작·종료 날짜 입력 후 검색 |
| 8 | 지도 영역 기반 검색 | JUnit `FoundItemMapApiTest`(영역 안/밖·키워드·잘못된 영역·범위 밖), `LostReportApiTest.mapUsesBuildingCoordinates`. MySQL 점검(영역 검증 400, 건물 좌표 대체) | 부분 통과 | **"이 지역에서 다시 검색" 버튼 등 지도 화면 동작은 Kakao 키가 없어 확인하지 못했다.** 절차: 키 설정 후 `/map`에서 지도를 이동 → 버튼 → 목록 갱신 확인 |
| 9 | 지도 클릭을 통한 좌표 등록 | JUnit `FoundItemControllerTest.createValidatesCoordinates`·`createWithImages`(좌표 저장), Vitest `MapLocationPicker.test.jsx`(키 없을 때 "시연용 위치 선택", "이 위치로 선택" 확정), `mapMarkers.test.js` | 부분 통과 | **지도를 눌러 핀을 만들고 드래그하는 동작은 확인하지 못했다(키 없음).** 절차: 키 설정 → 습득물 신고 → "지도에서 위치 선택" → 지도 클릭·핀 드래그 → "이 위치로 선택" → 미리보기의 지도 위치 항목 |
| 10 | 발견 위치 및 보관 위치 구분 | JUnit `FoundItemReportFlowTest.reportHandedOverWithOfficialStorage`·`FoundItemControllerTest.detailResponseContainsStorageInfo`(필드 분리). 브라우저 과업 A(상세에 "발견한 곳"/"지금 보관 중인 곳" 분리, 발견 도서관 ≠ 보관 행정관) | 통과 | 사용자가 둘을 혼동하지 않는지는 **사용성 테스트로 확인할 위험**이라 확인하지 않았다 |
| 11 | 분실 신고 | JUnit `LostReportApiTest`(작성·검증·권한·수정 잠금·소프트 삭제 등). MySQL 점검(33개). 브라우저(조건이 채워진 폼 → 접수 → 완료 화면 → 추천) | 통과 | — |
| 12 | 반환 신청 | JUnit `ReturnPolicyTest`. MySQL 점검 91개(신청·취소·승인·반려·완료·자동 반려). 브라우저(신청 → 접수 완료 → 마이페이지에 "신청 대기"). Vitest `ReturnRequestPage`·`AdminReturnRequests` | 통과 | 관리자 승인·완료를 브라우저로 클릭해 본 것은 아니다(API와 Vitest로 확인). 절차: `admin@demo.local`로 `/admin` → 반환 신청 탭에서 승인·반환 완료 |
| 13 | 관리자 권한 확인 | JUnit `AuthApiTest.adminOnly`. MySQL 점검(비로그인 401, 일반 사용자 403, 관리자 200 — 관리자 API 전체·dev API). Vitest `ProtectedRoute.test.jsx`(일반 사용자에게 안내 화면) | 통과 | — |
| 14 | 중복 반환 방지 | **MySQL 점검만**: 같은 사용자의 동시 4회 제출 → 1건 생성, 서로 다른 두 신청의 동시 승인 → 1건만 성공, 승인된 신청은 물품당 1건. 반환 진행 중 신규 신청·두 번째 승인 409 | 통과 | H2는 행 잠금 동작이 달라 JUnit로는 동시성을 검증하지 못한다. 동시성 점검은 MySQL 26.10(프로젝트 기준 8.4)에서만 했다 |
| 15 | 삭제된 데이터의 검색 결과 제외 | JUnit `FoundItemRepositoryTest.testSoftDeleteExclusion`, `FoundItemSearchFilterTest.softDeletedExcludedEverywhere`(목록·지도·최근·상세), `LostReportApiTest.softDelete`. MySQL 점검(DB의 `deleted_at` 설정 확인). 브라우저(삭제 후 조회에서 사라짐) | 통과 | — |
| 16 | 모바일 반응형 레이아웃 | 브라우저 66회 점검(21개 화면 + 없는 주소 × 375·768·1280px): 가로 넘침 0, 터치 영역 44px, 입력 글자 16px, 이름 없는 컨트롤 0, 대비 4.5:1(전 항목 0건). 스크린샷 `docs/screenshots/` | 통과 | **실제 스마트폰·태블릿 기기에서는 확인하지 않았다**(Chrome의 화면 크기 에뮬레이션). 절차: 실제 기기로 `http://<PC IP>:5173` 접속(`npm run dev -- --host`) 후 두 과업 수행 |
| 17 | 필수 항목 누락 검증 | JUnit `FoundItemReportFlowTest.missingRequiredFields`·`LostReportApiTest.validation`. Vitest `ReportFoundPage.test`·`ReportLostPage.test`·`ReturnRequestPage.test`·`returnRequestForm.test`. 브라우저(분실 신고에서 날짜를 비우면 "1개 항목을 확인해 주세요" 요약과 항목별 문구) | 통과 | — |
| 18 | 잘못된 이미지 파일 처리 | JUnit `ImageTypeDetectionTest`(텍스트 파일·RIFF지만 WebP 아님·너무 짧은 파일 거절)·`FoundItemReportFlowTest.fakeImageRejected`·`tooManyImages`. Vitest `imageValidator.test`. 브라우저(텍스트 파일을 사진으로 고르면 거절되고 미리보기에 추가되지 않음) | 통과 | 확장자만 `.jpg`로 바꾼 가짜 파일을 **브라우저에서** 올려 본 적은 없다(서버는 JUnit로 거절 확인) |
| 19 | 지도 API 키 미설정 상태 처리 | 브라우저(`frontend/.env` 없음): `/map`이 안내 + 건물별 목록으로 대체, 분실 신고 화면이 열림, **과업 A·B가 끝까지 완료**. Vitest `MapLocationPicker.test.jsx`("시연용 위치 선택" 표시) | 통과 | — |
| 20 | 서버 연결 실패 시 오류 처리 | 브라우저(네트워크를 오프라인으로 전환한 뒤 검색 → "물품을 불러올 수 없습니다" 안내, 화면은 유지). 코드: `api/client.js`의 `toUserError`(연결 불가·502~504 문구), 서버 `GlobalExceptionHandler` | 통과 | 서버가 아예 꺼진 상태의 모든 화면을 하나씩 확인하지는 않았다(조회 화면 한 곳). 절차: 백엔드를 끄고 홈·상세·신고 제출에서 안내 문구가 나오는지 |

## 요약

- 20개 중 **통과 18, 부분 통과 2**.
  - 부분 통과는 8번(지도 영역 검색 화면)과 9번(지도 클릭 좌표 등록 화면)이다. Kakao 키가 없어 지도 SDK 동작을 확인하지 못했다. 두 항목의 서버 쪽(영역 API, 좌표 저장·검증)과 키 없는 대체 화면은 확인했다.
  - 통과로 둔 항목에도 위 표의 "확인하지 못한 것"이 남아 있다. 특히 16번은 실제 기기가 아니라 화면 크기 에뮬레이션으로 확인했다.
- 사용성 테스트(사람 대상)는 하지 않았다. 사용성 목표(5명 중 4명)는 설계 목표로만 남긴다.
