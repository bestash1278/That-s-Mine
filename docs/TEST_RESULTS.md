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
