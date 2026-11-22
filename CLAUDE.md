# CLAUDE.md — 교내 분실물 조회 및 신고 시스템 ("That's Mine")

이 파일은 Claude Code가 매 세션 자동으로 읽는 프로젝트 규칙이다. 상세 요구사항은 `docs/SPEC.md`에 있으며, 기능을 구현하기 전에 해당 섹션을 반드시 읽는다.

## 프로젝트 요약
- 교내 습득물/분실 신고를 통합 관리하는 반응형 웹 앱 (HCI 수업 프로젝트)
- 기능 구현뿐 아니라 사용성·일관성·오류 예방·피드백을 평가받는다
- 모노레포: `frontend/` (React), `backend/` (Spring Boot), `docs/`

## 설계 근거 문서 (docs/)
UI·기능 결정을 내릴 때는 아래 문서를 근거로 삼는다. 모두 **가상 사례 기반 초안**이므로 문서의 수치와 발화를 실제 조사 결과처럼 README나 화면에 쓰지 않는다.
- `223625_장재영_프로젝트제안서 (1).md`: 목표, 범위, 제외 범위, 위험 대응
- `223625_장재영_사용자연구계획 (2).md`: 평가 과업 2개와 성공 판정 기준
- `223625_장재영_05_맥락질의_워크북 (1).md`: 가상 참여자 P01 관찰, 핵심 사건 C01~C03
- `223625_장재영_06_작업분석어피니티_워크북.md`: 인사이트 I01~I03, To-be 흐름, 요구사항 우선순위 1~4
- `223625_장재영_UI디자인방법론 (1).md`: 3프레임 흐름, 개인정보 비판 검토
- `223625_장재영_인터랙션분석 (2).md`: 인터랙션 원칙(가시성·피드백·대응·제약), 정보 위계 사례

### 문서에서 도출한 핵심 설계 원칙
1. **조회 경로가 주 과업, 지도는 보조 수단이다.** 지도는 사용자가 요구한 기능이 아니라 설계안이다(06 §3). 모든 핵심 과업은 지도와 Kakao 키 없이 목록→상세만으로 끝까지 완료할 수 있어야 한다.
2. **발견 위치와 현재 보관 위치를 절대 혼동시키지 않는다.** 이 혼동은 파일럿에서 확인할 위험이다(연구계획 §9). 라벨은 "발견한 곳", "지금 보관 중인 곳"처럼 질문형에 가깝게 쓰고, 아이콘·색·배치를 둘로 분리한다.
3. **보관 장소 다음에는 "그래서 어떻게 찾아가나"를 바로 보여준다.** 문의처, 운영 시간, 수령 시 준비물, 담당자 확인 절차를 함께 표시한다(I03, UI방법론 프레임 3).
4. **물건을 구별할 정보는 앞에, 소유 확인 정보는 숨긴다.** 사진, 특징, 발견 날짜·장소는 목록과 상세에서 잘 보이게 둔다(I02). 소유자만 아는 고유 특징, 이름, 학번, 연락처는 공개하지 않는다(UI방법론 비판 검토, 제안서 위험표).
5. **검색 실패는 막다른 길이 아니다.** 결과가 없으면 조건 변경과 분실 신고로 이어주고, 입력한 검색 조건을 신고 폼에 미리 채운다(C03, I03).
6. **검색어 표현 차이를 흡수한다.** P01은 "이어폰"과 "에어팟"을 번갈아 검색했다(M05). 간단한 동의어 사전으로 이런 차이를 흡수한다.
7. **목록 카드는 정보 위치를 고정한다.** 모든 카드에서 물품명 → 발견일·발견 장소 → 보관 상태·보관 장소 순서를 같은 위치에 둔다(인터랙션분석 문제 1과 같은 패턴 예방).
8. **모바일 우선.** 대표 사용 맥락은 수업 사이 공강에 스마트폰으로 약 10분 동안 확인하는 상황이다(UI방법론, 05 §1).
9. **조회 결과는 소유권 증명이 아니다.** 추천과 상세 화면 모두 "실제 수령 시 담당자가 소유 여부를 확인합니다"를 표시하고, 자동 소유 판정은 하지 않는다(제안서 제외 범위).

### 평가 과업 (구현이 반드시 지원해야 함)
- **과업 A, 찾기(3분)**: "도서관에서 파란색 파우치를 잃어버림 → 맞는 물건과 현재 보관 장소를 답한다." 시드 데이터에 비슷한 오답 후보, 그리고 발견 장소와 보관 장소가 다른 사례가 있어야 한다.
- **과업 B, 신고(5분)**: "학생회관에서 검은색 우산을 주움 → 날짜, 장소, 종류, 특징을 입력하고 제출 완료 화면까지 도달한다." 사진은 미리 준비한 예시 이미지로 선택 동작만 시험한다.
- 5명의 참여자가 같은 초기 상태에서 시작해야 하므로 **dev 프로필 전용 시연 데이터 초기화** 기능을 제공한다.
- 제외 범위(제안서 §4): 학교 시스템 연동, 자동 소유 판정, 배송, 푸시·이메일 알림. 범위 밖 기능을 임의로 추가하지 않는다.

## 기술 스택 (임의 변경 금지)
- Frontend: React + Vite + JavaScript(TypeScript 아님) + Tailwind CSS + React Router + Axios + lucide-react + Kakao Maps JS SDK
- Backend: Java 17, Spring Boot 3.x, Gradle(Wrapper), Spring Data JPA, Spring Security, JWT, Bean Validation
- DB: MySQL 8 (운영/개발), 테스트는 H2(MySQL 모드) 프로필 사용
- 마이그레이션: Flyway (`backend/src/main/resources/db/migration/V*__*.sql`)
- 위 목록에 없는 라이브러리는 꼭 필요할 때만 추가하고, 추가 이유를 커밋 메시지에 적는다

### 버전 기준 (2026-11 확인, 호환성 검증된 조합)
| 영역 | 버전 | 비고 |
|---|---|---|
| JDK | 17 (21도 가능) | Boot 3.5는 Java 17~25 지원 |
| Spring Boot | **3.5.16** | 3.x 마지막 릴리스. 3.4.x는 2025-12 지원 종료. 명세가 3.x를 요구하므로 4.x로 올리지 않는다 |
| io.spring.dependency-management | 1.1.7 | |
| Gradle Wrapper | **8.14.x** | Boot 3.5는 Gradle 7.6.4+/8.4+를 지원하고 9.x는 공식 목록에 없음. `gradlew`, `gradlew.bat`, `gradle/wrapper/*`를 반드시 커밋 |
| MySQL 드라이버 | `runtimeOnly 'com.mysql:mysql-connector-j'` (버전 생략, Boot 관리) | 옛 좌표 `mysql:mysql-connector-java` 금지 |
| Flyway / H2 / Hibernate | Boot 관리 버전 사용(직접 버전 지정 금지) | `flyway-core` + `flyway-mysql` |
| Hibernate dialect | 지정하지 않음(자동 감지) | `MySQL8Dialect`는 deprecated |
| jjwt | 0.13.0 (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`) | |
| MySQL 서버 | **8.4 LTS** | 8.0은 2026-04 EOL |
| Node.js | **22.12 이상 또는 24 LTS** | Vitest 5가 Node 22.12+를 요구 |
| Vite / @vitejs/plugin-react | 8.x / 6.x | plugin-react 6은 Vite 8 필요 |
| Vitest | 5.x + **jsdom** devDependency | jsdom 없으면 테스트 환경 로드 실패 |
| React / React Router | 19.x / `react-router-dom` 7.x | |
| Tailwind CSS | 3.4.x + PostCSS + autoprefixer | v4로 올리지 않는다(설정 방식이 다름). `src/index.css`에 `@tailwind base; @tailwind components; @tailwind utilities;` |
| 기타 | axios 1.x, lucide-react 최신, @testing-library/react 16 + @testing-library/dom 10 + jest-dom | 빌드 도구(tailwind, postcss, autoprefixer)는 devDependencies |

### 시간대
- 날짜 검증(미래 날짜 금지)은 한국 시간 기준이다. 백엔드는 `Asia/Seoul`로 고정한다(`TimeZone.setDefault` 또는 `-Duser.timezone`, JDBC URL `serverTimezone=Asia/Seoul`, `spring.jpa.properties.hibernate.jdbc.time_zone=Asia/Seoul`). 프론트의 "오늘" 기본값도 로컬 날짜로 계산한다(`toISOString()`은 UTC라서 쓰지 않는다)

## 개발 환경 주의사항 (Windows)
- 프로젝트 경로 `C:\That's Mine`에 **작은따옴표와 공백**이 있다. 셸 명령에서 경로는 항상 큰따옴표로 감싼다. 스크립트에 절대경로를 하드코딩하지 않는다.
- 백엔드 빌드는 `gradlew.bat` (PowerShell: `.\gradlew.bat`) 사용
- 작업 시작 전 `java -version`, `node -v`, `npm -v`, `mysql --version`(또는 접속 가능 여부)을 확인하고, 없는 도구는 사용자에게 알린 뒤 가능한 범위(예: H2)로 진행한다

## 주요 명령어
```
# backend
cd backend
.\gradlew.bat build          # 컴파일 + 테스트
.\gradlew.bat test
.\gradlew.bat bootRun --args="--spring.profiles.active=dev"

# frontend
cd frontend
npm install
npm run dev
npm run build
npm run lint
npm run test                 # Vitest
```

## 아키텍처 규칙
### Backend (`com.thatsmine` 패키지 기준)
- 계층: config / controller / service / repository / entity / dto / security / exception / enums / util
- Controller는 Repository를 직접 호출하지 않는다. 비즈니스 로직은 Service에.
- Entity를 응답으로 반환하지 않고 DTO 사용
- `@RestControllerAdvice` 공통 예외 처리 → 응답 형식 통일: `{ "code": "...", "message": "한국어 메시지", "fieldErrors": [...] }`
- 모든 API 경로는 `/api/v1` 접두사
- 상태 전이는 Service에서 허용된 전이표로 검증 (프론트 검증만 믿지 않는다)
- 반환 신청 승인/완료는 트랜잭션 + 비관적 락(또는 낙관적 락 `@Version`)으로 중복 반환 방지
- Soft delete(`deleted_at`): 일반 검색·지도·추천 쿼리에서 반드시 제외

### Frontend
- 디렉터리: `src/{api,assets,components/{common,layout,found-item,lost-report,map,auth},pages,hooks,contexts,utils,constants,styles}`
- API 호출은 `src/api/`의 Axios 인스턴스로만 (baseURL `/api/v1`, JWT 인터셉터, 401 처리)
- 상태값·카테고리·라벨 매핑은 `src/constants/`에 한 곳에서 정의 (백엔드 enum과 동일한 문자열)
- 지도 컴포넌트: `CampusMap`, `MapLocationPicker`, `ItemMarker`, `MapItemPopup`, `MapSearchFilter`, `MapLegend`, `LocationSearch`, `CurrentLocationButton`
  - 이벤트 리스너 중복 등록 금지, unmount 시 정리
  - `MapLocationPicker`는 습득물 신고/분실 신고/보관 장소 등록에서 재사용
  - **Kakao 키가 없거나 SDK 로드 실패 시 앱 전체가 죽지 않아야 한다** → 안내 문구 + 건물 선택/직접 입력 대체 UI, "시연용 위치 선택" 표시로 실제 지도와 구분

## 공유 상태값 (프론트·백엔드 문자열 일치 필수)
- 습득물 status: `REPORTED`, `STORED`, `RETURN_PENDING`, `RETURNED`, `HIDDEN`
- 보관 유형 custodyType: `PENDING_HANDOVER`, `HANDED_OVER`, `TEMPORARY` (status와 독립)
- 분실 신고 status: `SEARCHING`, `FOUND`, `CLOSED`
- 반환 신청 status: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`
- 사용자 role: `USER`, `ADMIN`

## UI 규칙
- 모든 사용자 노출 텍스트는 한국어
- 색상(Tailwind theme에 토큰으로 등록): primary `#183B62`, accent `#2563EB`, surface `#F5F7FA`(페이지 배경), card `#FFFFFF`, ink `#1F2937`(본문), ink-sub `#6B7280`(보조), success `#16A34A`, error `#DC2626`. `text`, `bg` 같은 Tailwind 유틸리티와 겹치는 키 이름은 쓰지 않는다
- 그라데이션·과한 애니메이션 금지, 카드형 UI, 버튼/입력/카드 스타일은 공통 컴포넌트로 통일
- 상태는 색상 + 텍스트 배지로 함께 표시
- 로딩 / 오류 / 결과 없음 / 완료 상태를 모든 데이터 화면에 구현
- 모바일 터치 영역 최소 44px, 키보드 접근성(포커스 표시, label 연결, aria 속성)
- 입력 항목 이름은 placeholder로 대신하지 않고 항상 보이는 label로 둔다. 필수 항목은 "*"와 "(필수)" 텍스트를 함께 쓰고, 입력 예시는 보조 문구로 준다
- 텍스트 대비는 WCAG AA(4.5:1) 이상. 모바일 입력 글자는 16px 이상(iOS 확대 방지). 의미 없는 장식 아이콘은 쓰지 않는다
- 위치를 표시할 때는 항상 "발견 위치(빨강, MapPin)"와 "보관 위치(파랑, Archive 등 다른 아이콘)"를 텍스트 라벨과 함께 표기한다
- API 요청 중 제출 버튼 비활성화 + 로딩 표시 (중복 제출 방지)

## 보안 규칙
- 비밀번호 BCrypt 해시, JWT 서버 검증, 관리자 권한은 서버에서 `ROLE_ADMIN`으로 판단
- 작성자 또는 관리자만 수정/삭제
- DB 비밀번호, JWT 비밀키 등은 환경변수. `.env`, `application-local.yml` 등 실제 값 파일과 자동 실행 로그 `logs/`는 `.gitignore`에 넣고, `.env.example`만 커밋
- API 키·DB 접속정보를 **임의로 만들어 넣지 않는다**. 플레이스홀더와 설정 방법만 제공
- 이미지 업로드: 최대 3장, 장당 5MB, JPG/PNG/WebP. 확장자 + 매직바이트(실제 형식) 서버 검증, 저장 파일명은 UUID, 경로 조작 방지
- 위도(-90~90)/경도(-180~180) 서버 검증
- 습득자 개인 연락처·거주지, `private_features`, 반환 신청의 소유 확인 특징(ownership_description)은 일반 사용자 응답 DTO에 아예 필드로 두지 않는다(공개 DTO와 관리자 DTO를 분리)
- TEMPORARY(습득자 임시 보관) 물품은 습득자 연락처를 노출하지 않는다. "습득자가 보관 중 · 반환 신청 시 관리 부서가 연결"로 안내한다
- 테스트 계정(관리자/일반)은 `dev` 프로필과 배포 시연용 `demo` 프로필(13단계)에서만 생성. `demo`는 비밀번호를 환경변수 `DEMO_ACCOUNT_PASSWORD`로만 받고 기본값을 두지 않는다

## 데이터 규칙
- 캠퍼스 좌표·건물 정보는 실제 정보처럼 확정하지 않는다. 설정값/DB로 관리하고 시드 데이터는 "시연용"으로 명시
- 시드 물품: SPEC §25의 10종 + 평가 과업용 항목(아래). 실제 개인정보 금지, 여러 상태 포함
  - 과업 A: 정답 "파란색 파우치"(발견: 도서관, 보관: 다른 건물의 관리 부서) + 오답 후보 "남색 파우치", "파란색 필통", 다른 날짜의 "파란색 파우치"(RETURNED)
  - 과업 A의 정답은 참여자마다 바꿀 수 있도록 비슷한 세트 1~2개를 더 둔다(연구계획 §5 "정답 물건은 바꿈")
  - 과업 B: 학생회관 건물, "우산" 카테고리 매핑(의류·잡화), 예시 사진 `frontend/public/demo-photos/`

### SPEC §18 대비 추가 컬럼 (연구 문서 근거, docs/ERD.md에 차이 기록)
- `STORAGE_LOCATIONS.contact_phone`, `operating_hours`, `pickup_guide`: 문의처, 운영 시간, 수령 시 준비물(I03)
- `FOUND_ITEMS.private_features`: 습득자가 입력하는 소유 확인용 비공개 특징. 신고자 본인과 ADMIN만 조회
- `FOUND_ITEMS.version`: 반환 동시성 제어용 낙관적 락
- `SEARCH_SYNONYMS(synonym_id, term, canonical)`, 또는 동일한 역할의 설정 파일: 검색 동의어 사전

## 작업 방식
- 큰 단계 시작 전 계획을 먼저 제시하고, 작업 목록(Todo)으로 진행 상황을 관리한다
- 단계마다 빌드·테스트를 실제로 실행하고, 실패하면 원인을 분석해 수정한다
- **실행하지 않은 테스트를 성공으로 보고하지 않는다.** 실행 불가 시 이유를 `docs/TEST_RESULTS.md`에 기록
- 사용성 목표 수치(SPEC §24)는 설계 목표일 뿐, 달성했다고 쓰지 않는다
- 기존 기능을 깨뜨리지 않는다. 핵심 기능(습득물 조회·상세·보관 장소·신고·지도 조회/등록)을 최우선
- 의미 있는 단위로 git 커밋 (커밋 메시지는 한국어 가능)
