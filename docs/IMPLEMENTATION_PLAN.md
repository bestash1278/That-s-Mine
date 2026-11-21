# 전체 구현 계획 (Implementation Plan)

SPEC §26 개발 순서를 기준으로 단계별 구현 전략 수립. 평가 과업 A, B 지원 기능을 최우선 완성.

**주의**: 이 계획은 제안 단계이며, 실제 진행 중 환경·기술 제약에 따라 조정될 수 있음.

---

## Phase 1: 기초 구성 (1~2주차)

### 1-1. 프로젝트 분석 및 환경 구성

**목표**: 개발 환경 확인, 디렉터리 구조 준비, 초기 설정

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| 프로젝트 디렉터리 생성 | frontend/, backend/, docs/ | 모노레포 구조 완성 | `ls -la` |
| Backend 초기 설정 | backend/build.gradle, backend/src/main/resources/application.yml | Gradle 프로젝트 생성, 의존성 정의 | `cd backend && ./gradlew.bat tasks` |
| Frontend 초기 설정 | frontend/vite.config.js, frontend/package.json | Vite 프로젝트 생성, 의존성 정의 | `cd frontend && npm install` (H2에서 먼저 테스트) |
| .gitignore, .env.example | .gitignore, .env.example, backend/.env | 환경변수·로그 미노출 설정 | `git status` |
| Java 버전 업그레이드 | - | Java 17 이상 설치 | `java -version` → 17 이상 확인 |

**검증**: 
```bash
cd backend && ./gradlew.bat build --dry-run
cd frontend && npm run build --dry-run
```

---

### 1-2. 데이터베이스 & Entity 설계

**목표**: 테이블 설계, Flyway 마이그레이션, JPA Entity 작성

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| 데이터베이스 ERD 작성 | docs/ERD.md | 테이블 관계도 + SPEC §18 대비 추가 컬럼 명시 (contact_phone, operating_hours, pickup_guide, private_features, version) | 문서 검토 |
| Flyway 마이그레이션 스크립트 | backend/src/main/resources/db/migration/V1__init.sql | 모든 테이블(USERS, CATEGORIES, CAMPUS_BUILDINGS, STORAGE_LOCATIONS, FOUND_ITEMS, FOUND_ITEM_IMAGES, LOST_REPORTS, LOST_REPORT_IMAGES, RETURN_REQUESTS) 생성 | `SELECT * FROM information_schema.tables WHERE table_schema='your_db'` |
| JPA Entity 클래스 | backend/src/main/java/com/thatsmine/entity/*.java | User, Category, Campus Building, StorageLocation, FoundItem, FoundItemImage, LostReport, LostReportImage, ReturnRequest | `./gradlew.bat test` (Entity 로드 확인) |
| DTO 클래스 | backend/src/main/java/com/thatsmine/dto/*.java | 공개(일반 사용자)·관리자 DTO 분리; 개인정보 제외 | 컴파일 성공 |
| Enum 클래스 | backend/src/main/java/com/thatsmine/enums/*.java | ItemStatus, CustodyType, LostReportStatus, ReturnRequestStatus, UserRole | 컴파일 성공 |

**검증**:
```bash
# H2 테스트 환경에서 마이그레이션 실행
cd backend
./gradlew.bat bootRun --args="--spring.profiles.active=test" 
# 콘솔에서 "Flyway: Successfully validated 1 migration"이 나타나면 OK
```

**DB 선택 옵션**: 
- MySQL 설치 여유 없으면 H2(MySQL 모드) + application-test.yml 사용
- 최종은 MySQL 환경에서 테스트

---

## Phase 2: 핵심 API (3~4주차)

### 2-1. 습득물 조회·상세 API (평가 과업 A 지원)

**목표**: 분실물 목록 조회, 필터·검색, 상세 정보 조회

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| Repository 작성 | FoundItemRepository.java | 커스텀 쿼리: 필터(상태, 카테고리), 검색(물품명, 특징, 장소), 날짜 범위, 소프트 삭제 제외 | `./gradlew.bat test` (쿼리 테스트) |
| Service 비즈니스 로직 | FoundItemService.java | 검색·필터링 로직, 대응 가능한 상태 전이 검증 | 테스트 실행 |
| Controller & API | FoundItemController.java | GET /api/v1/found-items (목록), GET /api/v1/found-items/{id} (상세) | Postman/curl 테스트 |
| ExceptionHandler | GlobalExceptionHandler.java | 404(물품 없음), 400(잘못된 필터), 500(서버 오류) → 한국어 메시지 | HTTP 상태 코드 확인 |
| 시드 데이터 | db/migration/V2__seed_data.sql | 10종 물품 + 평가 과업용 세트(파란 파우치 등) | 조회 API 호출 시 데이터 반환 |

**검증**:
```bash
# 로컬에서 API 테스트
curl -X GET "http://localhost:8080/api/v1/found-items?keyword=%ED%8C%8C%EC%9A%B0%EC%B9%98&status=STORED" \
  -H "Content-Type: application/json"

# 응답 예시
{
  "code": "SUCCESS",
  "data": {
    "items": [{
      "id": 1,
      "title": "파란색 파우치",
      "category": "의류·잡화",
      "foundDate": "2026-11-15",
      "foundLocation": "도서관",
      "status": "STORED",
      "storageLocation": "학생회관 1층 관리실",
      "thumbnail": "url"
    }],
    "totalCount": 1
  }
}
```

---

### 2-2. 습득물 등록 API (평가 과업 B 지원)

**목표**: 습득물 신고 등록, 보관 위치 관리

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| POST /api/v1/found-items | FoundItemService, FoundItemController | 필수 필드(카테고리, 물품명, 발견일, 발견 위치, 보관 상태) 검증 | Postman POST 테스트 |
| 보관 장소 조회 | StorageLocationController | GET /api/v1/storage-locations | 운영시간, 연락처, 수령 절차 포함 |
| 위치 정보 검증 | ValidationUtil.java | 위도(-90~90), 경도(-180~180) 범위 확인 | 단위 테스트 |
| Soft Delete 처리 | FoundItem.java | deleted_at 필드, 쿼리에서 WHERE deleted_at IS NULL | 삭제 후 조회 시 나타나지 않음 |

**검증**:
```bash
curl -X POST "http://localhost:8080/api/v1/found-items" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "검은색 우산",
    "categoryId": 2,
    "description": "자동 우산",
    "foundDate": "2026-11-21",
    "foundLocation": "학생회관",
    "foundLatitude": 37.123,
    "foundLongitude": 127.123,
    "custodyType": "PENDING_HANDOVER",
    "status": "REPORTED"
  }'
```

---

### 2-3. 카테고리·건물·보관장소 조회 API

**목표**: 선택지 제공(드롭다운, 필터)

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| GET /api/v1/categories | CategoryController | 모든 카테고리 반환 | JSON 응답 확인 |
| GET /api/v1/campus-buildings | CampusBuilding Controller | 모든 건물 + 좌표 | 지도에 표시 가능 |
| GET /api/v1/storage-locations | StorageLocationController | 보관 장소 + 운영시간 + 문의처 + 수령 절차 | 상세 화면에서 표시 |

---

## Phase 3: 프론트엔드 UI (5~7주차)

### 3-1. 공통 UI 컴포넌트 & 메인 페이지

**목표**: Tailwind 테마 적용, 반응형 레이아웃, 공통 컴포넌트

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| Tailwind 테마 설정 | frontend/tailwind.config.js | 색상 토큰(primary, accent, error, success 등) 등록 | 테마 색상 정의 완료 |
| 공통 컴포넌트 | frontend/src/components/common/ | Button, Input, Card, Badge, Modal, Loading, ErrorMessage | 스토리북 또는 수동 테스트 |
| 헤더 & 네비게이션 | Header.jsx, Footer.jsx | 로그인 상태 분기, 모바일 하단 내비게이션 | 모바일/PC 뷰 확인 |
| 메인 페이지 | pages/HomePage.jsx | 검색창, 빠른 접근 카드, 카테고리, 최근 물품 | 화면 렌더링 확인 |
| 상수 정의 | constants/index.js | 카테고리, 상태값, API 경로 (백엔드 enum과 일치) | 컴파일 오류 없음 |

**검증**:
```bash
cd frontend
npm run dev
# http://localhost:5173 접속, 메인 페이지 로드 확인
npm run build
```

---

### 3-2. 습득물 조회·상세 화면 (평가 과업 A)

**목표**: 필터, 검색, 목록 카드, 상세 화면

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| 조회 페이지 | pages/FoundItemsPage.jsx | 검색·필터·정렬, 목록 카드, 페이지네이션 | API 호출 → 데이터 렌더링 |
| 상세 페이지 | pages/FoundItemDetailPage.jsx | 사진, 물품명, 발견·보관 위치(지도 또는 텍스트), 보관 장소 정보, 반환 신청 버튼(미구현 시 비활성화) | 상세 정보 표시 |
| 목록 카드 컴포넌트 | FoundItemCard.jsx | 물품명 → 발견일·장소 → 보관 상태·장소 순서 고정, 아이콘·색상 일관성 | 카드 렌더링 확인 |
| 발견·보관 위치 표시 | 상세 화면 | 발견(빨강 MapPin) vs 보관(파랑 Archive) 아이콘, 텍스트 라벨 명확히 | 혼동 없음 |
| 검색 실패 화면 | pages/FoundItemsPage.jsx | 결과 없음 안내, 필터 초기화 버튼, 분실 신고 버튼 | 검색 조건 변경 후 화면 확인 |

**검증**:
```bash
# 개발 서버에서 조회 페이지 열기
npm run dev
# http://localhost:5173/found-items 접속
# 검색·필터 동작 확인
# 상세 페이지 클릭 → 보관 장소·수령 절차 확인
```

---

### 3-3. 습득물 신고 페이지 (평가 과업 B)

**목표**: 신고 폼, 사진 업로드(예시), 위치 선택, 미리보기, 제출

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| 신고 폼 UI | pages/ReportFoundItemPage.jsx | 물품 정보(카테고리, 물품명, 특징), 발견 정보(날짜, 시간, 위치), 보관 정보, 사진 | 필수 필드 표시 |
| 위치 선택 (지도 불가 시 대체) | ReportLocationSelector.jsx | 건물 선택 + 상세 입력 (Kakao Maps 없을 시) | 위치 입력 가능 |
| 사진 업로드 UI | PhotoUploader.jsx | 파일 선택, 미리보기, 삭제, 대표 사진 선택 (평가용: 예시 사진만 사용) | 파일 선택 모달 동작 |
| 미리보기 화면 | ReportPreviewPage.jsx | 입력 내용 요약, 수정/제출 버튼 | 제출 전 확인 |
| 완료 화면 | ReportCompletePage.jsx | 신고 번호, 상태, 다음 단계 안내 | 모의 완료 메시지 표시 |

**검증**:
```bash
# 신고 폼 입력 → 미리보기 → 제출 프로세스 테스트
npm run dev
# 모든 필수 필드 입력 후 제출 버튼 활성화 확인
# 미리보기에서 모든 정보 표시 확인
```

---

### 3-4. 지도 기반 위치 선택 (대체 구조 포함)

**목표**: Kakao Maps 또는 대체 UI로 발견·보관 위치 선택

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| CampusMap.jsx | 지도 초기화, 현재 위치, 확대/축소 | Kakao Maps SDK 로드 또는 오류 처리 | 지도 렌더링 or 대체 UI |
| MapLocationPicker.jsx | 클릭으로 마커 생성, 드래그로 이동, 좌표 저장 | 발견·보관 위치 각각 선택 가능 | 선택 후 좌표 반환 |
| LocationSearch.jsx | 건물명 검색, 등록된 건물 선택 | 드롭다운에서 건물 선택 | 선택 후 좌표 자동 입력 |
| MapLegend.jsx | 마커 색상 설명(빨강=발견, 파랑=보관) | 범례 표시 | 색상 구분 명확 |
| Fallback UI | BuildingSelector.jsx, ManualLocationInput.jsx | Kakao 키 없을 시 건물 선택 + 상세 입력 | 지도 없이도 신고 완료 가능 |

**검증**:
```bash
# Kakao Maps 시나리오
# 1. .env REACT_APP_KAKAO_MAP_KEY 설정 → 지도 로드 확인
# 2. 지도 클릭 → 마커 생성 확인

# Fallback 시나리오
# 1. .env REACT_APP_KAKAO_MAP_KEY 삭제
# 2. 건물 선택 UI 렌더링 확인
# 3. 건물 선택 + 상세 입력 → 신고 완료
```

---

## Phase 4: 인증 & 추가 기능 (8~10주차)

### 4-1. 회원가입·로그인·JWT (8주차)

**목표**: 사용자 인증, JWT 토큰 발급·검증

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| POST /api/v1/auth/signup | AuthController, UserService | 이메일 중복 확인, BCrypt 해시, JWT 발급 | 회원가입 성공 후 토큰 반환 |
| POST /api/v1/auth/login | AuthController, UserService | 이메일·비밀번호 검증, JWT 발급 | 로그인 성공 후 토큰 반환 |
| JWT 필터 | JwtFilter.java | Authorization 헤더 검증, SecurityContext 설정 | 보호된 엔드포인트 접근 제어 |
| 프론트엔드 | LoginPage.jsx, SignUpPage.jsx | 폼 입력, API 호출, 토큰 저장(localStorage) | 로그인/회원가입 페이지 렌더링 |

---

### 4-2. 분실 신고 (9주차)

**목표**: 분실 신고 등록, 조회, 수정·삭제

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| POST /api/v1/lost-reports | LostReportService | 필수 필드 검증, Soft Delete 처리 | 분실 신고 등록 성공 |
| GET /api/v1/lost-reports, GET /api/v1/lost-reports/{id} | LostReportController | 조회, 필터·검색 | 분실 신고 목록 조회 |
| LostReportPage.jsx | 신고 폼, 미리보기, 완료 | 신고 프로세스 완료 | 개발 서버에서 테스트 |

---

### 4-3. 마이페이지 (9주차)

**목표**: 사용자 정보, 등록한 물품·신고 목록

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| GET /users/me | UserController | 로그인한 사용자 정보 | 마이페이지 로드 |
| GET /users/me/found-items, GET /users/me/lost-reports | 각 Controller | 사용자가 등록한 물품·신고 목록 | 목록 렌더링 |
| MyPage.jsx | 정보 조회·수정, 등록 목록, 로그아웃 | 마이페이지 렌더링 | 로그인 후 접근 확인 |

---

### 4-4. 반환 신청 (10주차, 범위에 따라 선택 구현)

**목표**: 반환 신청, 관리자 승인·반려, 완료 처리

| 작업 | 주요 파일 | 완료 기준 | 검증 명령 |
|------|---------|---------|---------|
| POST /found-items/{id}/return-requests | ReturnRequestService | 소유 특징 입력, 상태 초기화 | 반환 신청 등록 |
| PATCH /return-requests/{id}/status (관리자) | AdminController | 승인·반려·완료, 중복 반환 방지(낙관적 락) | 상태 전이 테스트 |

---

## Phase 5: 통합 & 최적화 (11~14주차)

### 5-1. 통합 테스트 (11주차)

**목표**: 프론트·백엔드 API 연동 검증

| 작업 | 완료 기준 | 검증 명령 |
|------|---------|---------|
| 조회 → 상세 → 반환 신청 흐름 | 모든 단계 성공 | 통합 테스트 체크리스트 |
| 신고 → 미리보기 → 제출 흐름 | 완료 화면 도달 | 평가 과업 A, B 시뮬레이션 |
| 오류 처리(네트워크 실패, 유효성 검증) | 오류 메시지 한국어 표시 | 모의 실패 시나리오 테스트 |

---

### 5-2. 반응형 UI & 사용성 (12주차)

**목표**: 모바일·태블릿·PC 모두 테스트, 접근성 개선

| 작업 | 완료 기준 | 검증 명령 |
|------|---------|---------|
| 모바일 뷰 | 너비 320px~480px에서 모든 화면 렌더링 | Chrome DevTools 모바일 에뮬레이션 |
| 터치 영역 | 최소 44px × 44px | Inspect Element로 버튼 크기 확인 |
| 텍스트 대비 | WCAG AA(4.5:1) 이상 | 명도 대비 검사 도구 |
| 키보드 접근 | 포커스 표시, label 연결, Tab 이동 가능 | 키보드만으로 폼 작성 가능한지 확인 |

---

### 5-3. 오류 수정 & 문서 (13~14주차)

**목표**: 버그 수정, 최종 문서 작성

| 작업 | 주요 파일 | 완료 기준 |
|------|---------|---------|
| 버그 수정 | 모든 오류 추적 & 수정 | 테스트 통과율 100% |
| README.md | 기술 스택, 프로젝트 구조, 실행 방법 | 한국어, 명확함 |
| API 문서 | docs/API.md | 모든 엔드포인트 설명 |
| 환경설정 가이드 | docs/SETUP.md | MySQL 설정, Kakao Maps 키 | 발급 방법 |
| 테스트 계정 | docs/TEST_ACCOUNTS.md | dev 프로필 테스트 계정 |
| 최종 테스트 결과 | docs/TEST_RESULTS.md | 각 과업별 성공/실패 기록 |

---

## 평가 과업 최우선 완성 경로

### 과업 A: 도서관 파란 파우치 찾기 (3분)

**필수 완성**: 
1. 습득물 조회 API (필터·검색)
2. 조회 UI (목록, 필터)
3. 상세 페이지 (보관 장소 정보)
4. 시드 데이터 (파란 파우치 + 오답 후보)

**최소 추정 일정**: Phase 2(API 1주) + Phase 3-2(UI 1주) = **2주**

---

### 과업 B: 학생회관 검은 우산 신고 (5분)

**필수 완성**:
1. 습득물 등록 API
2. 신고 페이지 UI (폼, 미리보기, 완료)
3. 위치 선택 (지도 또는 건물 선택 + 직접 입력)
4. 사진 업로드 UI (예시 사진만 사용)

**최소 추정 일정**: Phase 2(API 1주) + Phase 3-3(UI 1주) + Phase 3-4(지도 대체 1주) = **3주**

---

## 범위 조정 (일정 지연 시)

| 단계 | 축소 범위 | 영향 |
|------|---------|------|
| **1단계** | MySQL 미설치 → H2 테스트만 진행 | 최종 배포 시 MySQL 마이그레이션 필요 |
| **2단계** | 지도 기능 제거 → 건물 선택 + 직접 입력만 사용 | 과업 B 완료 가능, 지도 UI 미구현 |
| **3단계** | 반환 신청 미구현 | 평가 과업 미영향 |
| **4단계** | 추천 기능 미구현 | 범위 외(제안서 제외) |
| **5단계** | 관리자 페이지 미구현 | 범위 외 |

---

## 최종 완료 확인

```bash
# 과업 A 테스트
curl -X GET "http://localhost:8080/api/v1/found-items?keyword=파우치&status=STORED"
# 반환: 파란색 파우치(발견:도서관, 보관:학생회관 1층) 포함

# 과업 B 테스트
curl -X POST "http://localhost:8080/api/v1/found-items" \
  -d '{"title":"검은색 우산", "categoryId":2, "foundLocation":"학생회관", ...}'
# 반환: 신고 ID + 완료 상태

# 프론트엔드 테스트
npm run dev
# 1. 조회 페이지에서 파란 파우치 검색 → 3분 내 발견 가능
# 2. 신고 페이지에서 우산 신고 → 5분 내 완료 가능
```

---

## 미구현 사항 & 후속 계획

| 항목 | 사유 | 후속 계획 |
|------|------|---------|
| 동의어 사전 | 범위 외(단순 검색으로 충분) | 고급 기능으로 단계화 |
| 유사 물품 추천 | 범위 외(제안서 제외) | 추후 추가 가능 |
| 푸시 알림 | 범위 외(제안서 제외) | 모바일 앱 단계에서 추가 |
| 실제 학교 시스템 연동 | 학교 권한 필요 | 운영 단계에서 추가 |
| 배송·픽업 시스템 | 범위 외(제안서 제외) | 운영 단계에서 검토 |

---

**총 추정 일정**: 14주차 (약 3.5개월)
- Phase 1-2: 4주(기초 & 핵심 API)
- Phase 3: 4주(프론트엔드 UI)
- Phase 4: 3주(인증 & 추가)
- Phase 5: 3주(통합 & 최적화)

**병렬 가능 작업**: Backend API(2-1~2-3)와 Frontend(3-1)는 겹칠 수 있음 → 실제 일정 단축 가능
