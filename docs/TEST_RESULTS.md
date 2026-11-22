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
- **MySQL 8.4 + Flyway 실행**: MySQL이 없어 `dev` 프로필 기동과 `V1~V3` 마이그레이션의 MySQL 적용은 확인하지 못했다(테스트는 H2 기준).
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
