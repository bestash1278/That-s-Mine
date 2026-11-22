# 테스트 결과

## 7~9단계 사후 테스트 (2026-11-22)

7~9단계는 개발 당시 빌드·테스트를 실행하지 못했다. 이 항목은 PC에서 실제로 실행한 결과다.
환경: Windows 11, JDK 17.0.0.1, Node 24.19.0, npm 11.17.0. **MySQL 없음**(H2 테스트 프로필만 사용).

### 실행 결과
| 명령 | 결과 |
|---|---|
| `backend: .\gradlew.bat build` | 통과 — 테스트 72개 중 72개 성공 (수정 후) |
| `frontend: npm install` | 완료 (jsdom 등 38개 패키지 추가 설치) |
| `frontend: npm test` | 통과 — 13개 파일, 76개 성공 (수정 후) |
| `frontend: npm run build` | 통과 (청크 500kB 초과 경고) |
| `frontend: npm run lint` | 오류 0, 경고 있음(only-export-components, set-state-in-effect) |

백엔드 테스트 구성: AuthApiTest 10, FoundItemControllerTest 8, FoundItemMapApiTest 4, FoundItemReportFlowTest 7, LostReportApiTest 11, MyPageApiTest 8, FoundItemRepositoryTest 3, JwtTokenProviderTest 5, EditPolicyTest 5, ImagePlanTest 5, ImageTypeDetectionTest 6.

### 테스트로 발견해 고친 문제
| # | 증상 | 원인 | 수정 |
|---|---|---|---|
| 1 | `compileJava` 실패 | `AdminFoundItemDTO`가 없는 `User.getName()` 호출 | `getNickname()`으로 변경 |
| 2 | `compileTestJava` 실패 (`FoundItemReportFlowTest`) | `.header()` 뒤에 `.file()`을 이어 써서 타입이 달라짐 | `.file()`을 `.header()` 앞으로 이동 |
| 3 | `AuthApiTest.signup` 400 | 이메일 앞뒤 공백이 `@Email` 검증에서 먼저 거부됨(서비스의 trim은 검증 뒤라 효과 없음) | `SignupRequest.setEmail`에서 trim. 앞뒤 공백·대문자 이메일도 가입 가능 |
| 4 | `LoginPage.test` "로그인 실패" 실패 | `authStorage`의 모듈 변수 `memoryToken`이 앞 테스트에서 남음 | 테스트 `beforeEach`에서 `clearToken()` 호출 |
| 5 | `ReportFoundPage.test` 중 미처리 오류 | jsdom에 `scrollIntoView` 없음 | `src/test/setup.js`에서 대체 구현 |

### 실행하지 못한 것 / 한계
- (당시 기록 — 이후 "MySQL 실제 실행 검증" 항목에서 MySQL 26.10 위에서 V1~V4 적용과 dev 프로필 기동을 확인함) **MySQL 8.4 + Flyway 실행**: MySQL이 없어 `dev` 프로필 기동과 `V1~V3` 마이그레이션의 MySQL 적용은 확인하지 못했다(테스트는 H2 기준).
- **Kakao 지도 실제 동작**(7단계): 키가 없고 브라우저 수동 확인을 하지 않았다. 마커·클러스터링·현재 위치·"이 지역에서 다시 검색"은 미확인. 키 없는 대체 UI와 마커 변환 로직은 단위 테스트(`MapLocationPicker.test`, `mapMarkers.test`)로만 확인.
- **브라우저 E2E**: 과업 A·B 흐름, 로그인 후 원래 페이지 복귀, 마이페이지 수정·삭제 대화상자, 반응형(모바일 시트)은 수동 확인 전이다.
- **multipart PATCH**(9단계): MockMvc에서는 통과했지만 실제 Tomcat에서의 수정 저장은 미확인.
- 접근성(대비·터치 영역·키보드)은 자동 검사를 하지 않았다.

## MySQL 실제 실행 검증 — 7~9단계 (2026-11-22)

위 "실행하지 못한 것" 중 **MySQL + Flyway 실행**과 **multipart PATCH(실제 Tomcat)** 항목을 이번에 확인했다.

### 환경
- MySQL Server 26.10.0 (로컬 서비스 `MySQL2610`, 3306). 클라이언트 8.0.46. 프로젝트 기준(8.4 LTS)과 다른 버전이다.
- DB `thatsmine_dev` 새로 생성(utf8mb4), `bootRun --spring.profiles.active=dev`, Java 17
- DB 비밀번호는 환경변수로만 전달했고 파일에 저장하지 않았다.

### 결과
| 항목 | 결과 |
|---|---|
| Flyway V1(init) · V2(categories) · V3(lost report building) | 3개 모두 `success=1` |
| dev 시연 데이터(DataInitializer) | 습득물 14건, 분실 신고 4건, 반환 신청 생성 확인 |
| API 흐름 점검 스크립트(7~9단계, 실제 HTTP) | **33개 통과 / 0개 실패** (최종 실행 기준) |

점검한 내용
- 7단계: 지도 영역 검증(최소>최대·범위 밖 → 400), 건물 좌표 대체 표시 필드, 분실 신고 지도는 '찾는 중'만
- 8단계: 비로그인 401, 위조 토큰 401, 일반 사용자의 관리자·dev API 403, 가입 시 role 요청 무시(USER), 비밀번호 확인 불일치·숫자 없음 400, 중복 이메일 400 + `fieldErrors.email`
- 9단계: 분실 신고 작성(201)·미래 날짜·기간 역전·위치 없음 400, 공개 응답에 신고자 정보 없음, 타인 수정·삭제 403, **multipart PATCH 200(실제 Tomcat)**, 찾기 완료 후 내용 수정 409·되돌리기 200, 삭제 후 공개 상세 404 + 내 목록 제외 + DB `deleted_at` 설정(soft delete), 반환 진행 중 습득물 삭제 409, 타인 습득물 삭제 403, 시연 데이터(user2 분실 신고 3건·반환 신청 1건), 비밀번호 변경 시 현재 비밀번호 확인

### 한계
- JUnit 테스트(`gradlew test`)는 여전히 H2 프로필이다. 이번 검증은 MySQL에 띄운 서버에 HTTP로 요청한 별도 점검이며 JUnit 테스트로 남기지 않았다.
- 브라우저 화면·Kakao 지도·모바일 확인은 하지 않았다(PROGRESS.md "PC에서 확인할 것" 그대로 남음).
- 사진 업로드(파일 파트)는 이번 점검에서 보내지 않았다.
- 중복 이메일은 409가 아니라 400 + 필드 오류로 응답한다(설계대로 동작, 점검 기준을 이에 맞춤).
- 시연 계정 로그인으로 점검 중 분실 신고 2건(id 5, 6)을 만들고 삭제했다(soft delete 행으로 남음). 시연 데이터 초기화 시 정리된다.

## 10단계 테스트 — 반환 신청 + 관리자 (2026-11-22, MySQL 기준)

환경: MySQL Server 26.10(로컬 `MySQL2610`), `bootRun --spring.profiles.active=dev`, Java 17, Node 22+

| 명령 | 결과 |
|---|---|
| `python -I backend/scripts/mysql_api_check_stage10.py` (MySQL 위의 실제 서버) | 91개 통과 / 0 실패 |
| `backend: .\gradlew.bat test` (H2 프로필) | 80개 통과, 실패 0 (`ReturnPolicyTest` 8개 추가) |
| `frontend: npm run build` | 통과 |
| `frontend: npm test` | 16개 파일, 90개 통과 |
| `frontend: npm run lint` | 오류 0 (기존과 같은 종류의 경고) |

점검 스크립트가 확인한 내용
- 권한: 비로그인 401, 일반 사용자의 `/admin/**` 403, 관리자 200, 비로그인 반환 신청 401
- 신청: 신고자 본인 신청 409, 특징 비움·너무 짧음 400 + `fieldErrors`, 정상 201, 같은 사람 중복 409, 다른 사람의 대기 신청 허용, 공개 상세에 신청자 설명·`privateFeatures` 없음, 신청 접수 후 신고자 삭제 409
- 처리: 반려 사유 없음 400, 관리자의 취소 상태 지정 400, 대기→반환 완료 409, 승인(물품 RETURN_PENDING), 같은 물품 두 번째 승인 409, 반환 진행 중 신규 신청 409, 승인된 신청 사용자 취소 409, 반환 진행 중 숨김 409, 승인 철회 시 STORED 복귀, 반환 완료(RETURNED) 후 재처리 409, 남은 대기 신청 자동 반려
- 취소: 대기 신청 취소 200, 재취소 409, 취소 후 재신청 201
- 신청 대상: 보관 장소 미확정 물품 409, 임시 보관(TEMPORARY) 접수 건 201
- **동시성(MySQL 행 잠금)**: 같은 사용자의 동시 4회 제출 → 신청 1건만 생성(201 1, 409 3), 서로 다른 두 신청의 동시 승인 → 하나만 성공(200 1, 409 1), 승인된 신청은 물품당 정확히 1건
- 관리자 습득물: 숨김 후 공개 상세 404·공개 목록 제외, 같은 상태 409, 직접 반환 완료 지정 409, 잘못된 상태값 400, 숨김 해제, 보관 장소 없이 '보관 중' 409, 보관 위치 지정 시 상태 자동 STORED, 전달 예정으로 되돌리면 REPORTED, 반환 완료 물품 보관 위치 변경 409, 발견 위치 수정과 좌표 범위 검증
- 장소 관리: 건물 등록·이름 중복·좌표 범위·이름 비움·수정·없는 건물 404, 보관 장소 등록(좌표 생략 시 건물 좌표)·건물 없음 400·전화번호 길이 400, 사용 중지 시 공개 목록에서 빠지고 관리자 목록에는 남음, 사용 중지 장소로 지정 400
- 분실 신고 관리자 목록: 모든 상태 포함, 상태 필터, 신고자 이메일 노출 없음

실행하지 못한 것 / 한계
- 브라우저(특히 375px 모바일)에서의 화면 동작과 Kakao 지도 연동(`MapLocationPicker` 재사용 부분)은 확인하지 않았다
- 위 점검 스크립트는 JUnit 테스트가 아니라 별도 HTTP 스크립트이므로 `gradlew test`에는 포함되지 않는다
- 서버가 MySQL 26.10이라 프로젝트 기준(8.4 LTS)과 다르다

## 11단계 테스트 — 유사 물품 추천 (2026-11-22, MySQL 기준)

환경: MySQL Server 26.10(로컬), `bootRun --spring.profiles.active=dev`

| 명령 | 결과 |
|---|---|
| `python -I backend/scripts/mysql_api_check_stage11.py` | 29개 통과 / 0 실패 |
| `python -I backend/scripts/mysql_api_check_stage10.py` (회귀) | 91개 통과 |
| `backend: .\gradlew.bat test` (H2) | 통과 (`MatchScorerTest` 15개 추가) |
| `frontend: npm test` | 17개 파일, 93개 통과 |
| `frontend: npm run build` / `npm run lint` | 통과 / 오류 0 |

점검 스크립트가 확인한 내용
- 권한: 비로그인 401, 다른 사용자 403, 본인·관리자 200, 없는 신고 404, 신고 종료·찾기 완료 신고는 빈 목록
- 순위: "흰색 무선 이어폰 케이스"의 1순위가 "검은색 무선 이어폰", 점수 내림차순·40~100·등급·이유 문장·최대 10건, 반환 완료 물품 제외
- 과업 A 유사 사례: "파란색 파우치" 분실 신고에서 정답 파우치가 오답(남색 파우치·파란색 필통)보다 위, 같은 이름의 반환 완료 파우치는 제외, 정답에 발견 장소 근접 이유 포함
- 날짜: 분실일 이전에 발견된 물품은 모두 제외
- 동의어: "에어팟" 분실 신고에 "무선 이어폰" 습득물 추천
- 마이페이지: 찾는 중인 신고에만 `similarItemCount`, 추천 목록 길이와 일치
- 상태 반영: 숨김·반환 완료된 물품은 추천에서 빠짐, 찾기 완료로 바꾸면 추천 종료
- 응답에 `privateFeatures`·신고자 정보 없음

한계
- 추천 점수의 정확도(실제로 맞는 물건을 얼마나 잘 찾는지)는 검증하지 않았다. 시연 데이터 몇 건에 대한 순위만 확인했다
- 브라우저(특히 375px)와 Kakao 지도 화면은 확인하지 않았다
- 서버가 MySQL 26.10이라 프로젝트 기준(8.4 LTS)과 다르다

## 12단계 최종 실행 결과 (2026-11-22)

환경: Windows 11, JDK 17, Node 24, Chrome 157(헤드리스), MySQL Server 26.10(로컬 서비스, 프로젝트 기준 8.4 LTS와 다름), dev 프로필, Kakao 키 없음. 실행한 명령과 결과를 그대로 적는다.

| 명령 | 결과 |
|---|---|
| `backend: .\gradlew.bat clean build` | BUILD SUCCESSFUL. 테스트 파일 14개, **106개 통과**, 실패 0, 오류 0, 건너뜀 0 (H2 프로필) |
| `frontend: npm run build` | 통과(번들 500kB 초과 경고) |
| `frontend: npm run lint` | 오류 0, 경고 16(effect 안 `setState`, 컴포넌트 외 내보내기 — 기존과 같은 종류) |
| `frontend: npm test` | 18개 파일, **97개 통과**, 실패 0 |
| `python backend/scripts/mysql_api_check_stage7_9.py` (MySQL 위 서버, 실제 HTTP) | 33 통과 / 0 실패 |
| `python backend/scripts/mysql_api_check_stage10.py` | 91 통과 / 0 실패(동시 신청·승인 포함) |
| `python backend/scripts/mysql_api_check_stage11.py` | 29 통과 / 0 실패 |
| `python backend/scripts/check_demo_reset.py node scripts/browser/flows.mjs` | 초기화 → 흐름 수행으로 데이터 변경(분실 신고 4→5, 반환 신청 1→2) → 다시 초기화 → **같은 초기 상태 재현**(물품 14·분실 신고 4·반환 신청 1·건물 6·보관 장소 3, 이름·상태 일치) |
| `node scripts/browser/flows.mjs` (헤드리스 Chrome 375px) | **36단계 통과 / 0 실패** |
| `node scripts/browser/audit.mjs` (22개 화면 × 375·768·1280px = 66회) | 가로 넘침 0, 작은 터치 영역 0, 작은 입력 글자 0, 라벨 없는 입력 0, 이름 없는 버튼·링크 0, alt 없는 이미지 0, 글자 대비 4.5:1 미달 0, 포커스 표시 없음 0, 콘솔 오류 0, 5xx 응답 0 |

백엔드 테스트 구성(14개 파일): AuthApiTest 10, FoundItemControllerTest 8, FoundItemSearchFilterTest 10, FoundItemMapApiTest 4, FoundItemReportFlowTest 7, LostReportApiTest 11, MyPageApiTest 8, FoundItemRepositoryTest 3, JwtTokenProviderTest 5, EditPolicyTest 5, ImagePlanTest 5, ImageTypeDetectionTest 6, MatchScorerTest 16, ReturnPolicyTest 8 (합계 106).

### 수정 전 상태 (같은 점검, 같은 화면)
첫 `audit.mjs`(66회): 글자 대비 미달 19종(최저 1.29:1), 작은 터치 영역 4종, 포커스 표시 없음 5종(날짜·시간 입력), 문서 제목 66회 모두 "frontend". 수정 내용은 `docs/PROGRESS.md` 12단계 표를 본다.

### 실행하지 못했거나 한계
- **실제 Kakao 지도 렌더링**(마커·클러스터·드래그·현재 위치·"이 지역에서 다시 검색" 버튼): 키가 없어 확인하지 못했다. 키 없는 대체 화면과 서버 API는 확인했다.
- **사람 대상 사용성 테스트**: 하지 않았다. `flows.mjs`의 "수행 시간"은 자동화 시간이라 사용성 시간이 아니다. 목표(5명 중 4명)는 설계 목표로만 둔다.
- **실제 스마트폰·태블릿 기기, 스크린리더**: 확인하지 않았다. 반응형은 Chrome의 화면 크기 에뮬레이션(375·768·1280px)으로 점검했다.
- 자동 대비 검사는 배경 이미지·그라데이션 위의 글자를 건너뛴다.
- 동시성 점검(중복 반환 방지)은 MySQL에서만 했다(H2는 행 잠금이 달라 JUnit로 검증 불가). MySQL 8.4 LTS가 아니라 26.10에서 실행했다.
- 습득물 수정을 사진 교체와 함께 **실제 Tomcat**(MySQL 점검)으로 보내 본 것은 아니다(분실 신고의 multipart PATCH는 확인).
- SPEC §27 항목별 근거와 수동 확인 절차는 `docs/VERIFICATION_CHECKLIST.md`에 있다(20개 중 18 통과, 2 부분 통과).

## 12단계 후속 — 보완 기능 테스트 (2026-11-22)

환경은 12단계 최종 실행과 같다(MySQL 26.10, dev 프로필). 보완한 기능은 `docs/PROGRESS.md` "12단계 후속"에 있다.

| 명령 | 결과 |
|---|---|
| `backend: .\gradlew.bat test` | 111개 통과, 실패 0 (이전 106 + 신규 5) |
| `frontend: npm test` | 19개 파일, 100개 통과 |
| `frontend: npm run build` | 통과 |
| `python backend/scripts/mysql_api_check_stage12.py` | 28 통과 / 0 실패: 로그아웃한 토큰 401·다른 로그인 유지·재로그아웃 200, 같은 내용 재전송 409, 동시 6회 제출 → 습득물·분실 신고 각각 정확히 1건 생성(DB 건수 확인), 관리자 상태 변경(권한 401/403, 같은 상태 409, 잘못된 값 400, 없는 신고 404, 신고자 마이페이지에 반영, 추천 종료), 응답에 신고자 이메일 없음 |
| `mysql_api_check_stage7_9 / 10 / 11` 재실행 | 33 / 91 / 29 통과 |
| `node scripts/browser/flows.mjs` | 36단계 통과 |

한계: 중복 제출 방지는 서버 한 대 기준이다. 화면에서 중복 제출 거절 메시지(409)가 보이는 모습은 브라우저로 확인하지 않았다(서버 응답과 기존 오류 표시 코드로만 확인).

## 13단계 — 배포 형태 검증 (2026-11-22)

| 명령 | 결과 |
|---|---|
| `backend: .\gradlew.bat test` | **136개 통과**, 실패 0 (이전 111 + `SpaRoutingTest` 22 + `DemoProfileGuardTest` 3) |
| `scripts\build-single.ps1` (`npm ci` + `npm run build` + `gradlew bootJar -PwithFrontend`) | 성공, `app.jar` 58.5 MB(프론트 포함) |
| `demo` 프로필로 jar 실행, `DEMO_ACCOUNT_PASSWORD` 없이 | 시작 실패 + 한국어 안내(환경변수 이름 포함) |
| `demo` 프로필로 jar 실행(MySQL 26.10, 빈 DB), 비밀번호 설정 | 시작 성공, Flyway V1~V4 적용, 시연 데이터 물품 14건·계정 3개 생성. 재시작하면 건수 그대로(중복 생성 안 함) |
| `scripts\smoke-test.ps1 -BaseUrl http://localhost:8080` | **14 통과 / 0 실패** |
| 헤드리스 Chrome으로 `http://localhost:8080` `/`, `/items`, `/items/1`, `/map`, `/login` | 모두 렌더링(화면 제목 포함), 콘솔 오류 없음 |
| 비회원 `POST /api/v1/dev/reset-demo`(demo 프로필) | 401 |
| 회귀(dev 프로필): `mysql_api_check_stage12 / 11 / 10 / 7_9` | 28 / 29 / 91 / 33 통과 |
| 회귀: `node scripts/browser/flows.mjs` | 36단계 통과 |

테스트가 잡은 문제: SPA 화면 경로를 열어 두는 보안 규칙을 `getServletPath()`로 썼더니 MockMvc(서블릿 경로가 빈 값)에서 **모든 GET이 인증 없이 열렸다**(`AuthApiTest.adminOnly` 실패로 발견). `getRequestURI()` 기준으로 고쳐 통과.

실행하지 못한 것: `docker build`·`docker compose up`(이 PC에 Docker 없음), Render·TiDB Cloud 배포와 Flyway 동작, 배포 주소에 대한 스모크 테스트(배포 주소 없음 → "배포 확인 대기"). 자세한 내용은 `docs/DEPLOY.md` 7번.
