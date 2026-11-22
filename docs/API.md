# REST API 명세 (v1)

모든 경로는 `/api/v1` 접두사를 쓴다. 개발 중에는 프론트 개발 서버(5173)가 `/api`, `/uploads`를 백엔드(8080)로 넘긴다.
실제 구현(`backend/src/main/java/com/thatsmine/controller/*`)을 기준으로 정리했다. SPEC §20 대비 추가 경로는 맨 아래에 따로 적었다.

## 공통

### 인증
- 로그인 응답의 `accessToken`(JWT, HS256, 기본 24시간)을 `Authorization: Bearer <토큰>` 헤더로 보낸다. 서버가 서명·만료·사용자 존재를 매 요청 검증한다.
- 권한: **비회원**(조회) / **로그인**(신고·신청·내 정보) / **ADMIN**(`/admin/**`, `/dev/**`). 관리자 여부는 서버가 토큰의 role로 판단한다.

### 응답 형식
```json
{ "code": "SUCCESS", "message": "한국어 메시지", "data": { } }
```
오류:
```json
{ "code": "VALIDATION_ERROR", "message": "1개 항목을 확인해 주세요.", "fieldErrors": { "title": "물품명을 입력해 주세요." } }
```

| HTTP | code | 의미 |
|---|---|---|
| 200·201 | SUCCESS·CREATED | 성공 |
| 400 | VALIDATION_ERROR·BAD_REQUEST | 입력 오류(`fieldErrors`에 항목별 문구), 형식 오류 |
| 401 | UNAUTHORIZED | 로그인 필요·토큰 만료·위조 |
| 403 | FORBIDDEN | 권한 없음(남의 신고 수정, 일반 사용자의 관리자 API) |
| 404 | NOT_FOUND | 없거나 삭제·숨김 처리됨 |
| 409 | CONFLICT | 지금 상태에서는 할 수 없는 요청(반환 진행 중인 물품 수정, 이미 처리된 신청 등) — `message`에 이유 문장 |
| 413 | FILE_TOO_LARGE | 업로드 용량 초과(장당 5MB, 요청 전체 16MB) |
| 500 | INTERNAL_ERROR | 서버 오류(내부 정보는 노출하지 않음) |

### 목록 응답(페이지)
```json
{ "content": [ ], "totalElements": 14, "totalPages": 1, "page": 0, "size": 20 }
```
`page`는 0부터 시작한다. `size`는 최대 50.

### multipart 요청
등록·수정(습득물·분실 신고)은 `multipart/form-data`로 보낸다.
- `request`: JSON 문자열(Content-Type `application/json` 파트)
- `images`: 사진 파일 0~3장(JPG·PNG·WebP, 장당 5MB). 확장자와 파일 앞부분(매직바이트)으로 실제 형식을 서버가 검증한다. 저장 이름은 UUID.

### 날짜·시간
날짜 `YYYY-MM-DD`, 시간 `HH:mm`(또는 `HH:mm:ss`). 한국 시간(Asia/Seoul) 기준이며 미래 날짜는 거절한다.

### 상태값 (프론트·백엔드 같은 문자열)
- 습득물 `status`: `REPORTED` 신고 접수, `STORED` 보관 중, `RETURN_PENDING` 반환 진행 중, `RETURNED` 반환 완료, `HIDDEN` 숨김 처리
- 보관 유형 `custodyType`(처리 상태와 독립): `PENDING_HANDOVER` 관리 부서에 전달 예정, `HANDED_OVER` 전달 완료, `TEMPORARY` 습득자가 임시 보관
- 분실 신고 `status`: `SEARCHING`, `FOUND`, `CLOSED`
- 반환 신청 `status`: `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`
- 사용자 `role`: `USER`, `ADMIN`

---

## 1. 인증 `/auth`

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| POST | `/auth/signup` | 비회원 | 회원가입 후 바로 로그인된 토큰을 돌려준다. 본문 `{ email, password, passwordConfirm, nickname }`. 이메일 앞뒤 공백 제거·소문자 저장, 비밀번호 8~64자 영문+숫자, 닉네임 2~20자. 가입은 항상 `USER`(요청의 role은 무시) |
| POST | `/auth/login` | 비회원 | `{ email, password }` → `{ accessToken, tokenType, expiresIn, user }`. 실패는 이메일 존재 여부를 알 수 없게 같은 메시지 |
| POST | `/auth/logout` | 비회원 | `Authorization` 헤더의 토큰이 유효하면 서버가 그 토큰의 고유 번호(jti)를 차단 목록(`revoked_tokens`)에 올려 **만료 전에도 401**이 된다. 같은 계정의 다른 로그인은 유지. 토큰이 없거나 이미 만료·위조여도 200 |
| GET | `/auth/check-email?email=` | 비회원 | 이메일 중복 확인 |

## 2. 내 정보·마이페이지 `/users/me` (로그인)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/users/me` | 내 정보 |
| PATCH | `/users/me` | 닉네임·비밀번호 수정. 비밀번호 변경은 `currentPassword` 필요 |
| GET | `/users/me/found-items?page&size` | 내가 신고한 습득물(숨김 포함, 수정·삭제 가능 여부 `editable`·`lockReason` 포함) |
| GET | `/users/me/found-items/{id}` | 수정 화면용 상세(**본인만**, 비공개 특징 포함) |
| GET | `/users/me/lost-reports?page&size` | 내 분실 신고(`contentEditable`·`lockReason`, 찾는 중이면 `similarItemCount`) |
| GET | `/users/me/return-requests?page&size` | 내 반환 신청 내역(내가 쓴 소유 확인 설명·담당자 메모 포함) |

## 3. 습득물 `/found-items`

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/found-items` | 비회원 | 목록 검색. 쿼리: `keyword`(이름·특징, 동의어 확장), `categoryId`, `buildingId`(발견 건물), `status`(없으면 숨김 제외 전체), `startDate`·`endDate`(발견 날짜), `sort`(`NEWEST` 기본, `OLDEST`, `LATEST_FOUND`, `OLDEST_FOUND`), `page`, `size` |
| GET | `/found-items/recent?limit=8` | 비회원 | 최근 등록 |
| GET | `/found-items/map` | 비회원 | 지도 영역 검색(최대 300건). 필수 `minLat,maxLat,minLng,maxLng`, 선택 `keyword,categoryId,status,startDate,endDate`. 영역이 범위 밖이거나 최소>최대면 400(`fieldErrors.bounds`). 응답에 `markerLatitude/markerLongitude/markerApproximate`(좌표가 없으면 건물 좌표로 대신, true) |
| GET | `/found-items/{id}` | 비회원 | 상세. **공개 DTO**: 사진, 특징, 발견 날짜·위치, 보관 상태·장소·`storageInfo`(문의처·운영 시간·수령 절차), 등록 시각. 비공개 특징·신고자 정보는 필드가 없다. 삭제·숨김이면 404 |
| POST | `/found-items` | 로그인 | 신고 등록(multipart). 같은 사용자가 같은 내용(물품명·종류·발견 날짜·발견 장소)을 60초 안에 다시 보내면 409(중복 제출 방지, 동시 요청도 1건만). `request` 필드: `title*, categoryId*, foundDate*, foundBuildingId 또는 foundLocation*, custodyType*, description, privateFeatures, foundTime, foundLocationDetail, foundLatitude/foundLongitude, storageId 또는 storageLocation(전달 완료일 때 필수), storageLocationDetail, storageLatitude/storageLongitude, representativeImageIndex`. 201 |
| PATCH | `/found-items/{id}` | 작성자 | 수정(multipart, 같은 필드 + `keepImageUrls`, `representativeImageUrl`). 반환 진행 중·완료·숨김·처리 중 신청이 있으면 409 |
| DELETE | `/found-items/{id}` | 작성자 | 삭제(Soft Delete: `deleted_at`). 수정과 같은 제한 |

## 4. 분실 신고 `/lost-reports`

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/lost-reports` | 비회원 | 목록. `keyword,categoryId,status(기본 SEARCHING),startDate,endDate`(분실 추정 기간과 겹치는지로 판단), `page,size`. 신고자 정보는 응답에 없음 |
| GET | `/lost-reports/map` | 비회원 | 지도 영역(찾는 중만) |
| GET | `/lost-reports/{id}` | 비회원 | 상세(본인이면 `mine`, 수정 가능 여부 포함) |
| GET | `/lost-reports/{id}/matches` | 신고자 본인·ADMIN | **유사 습득물 추천**(점수 높은 순 최대 10건). `[{ item, score, level, levelLabel, reasons[] }]`. 찾는 중이 아니면 빈 목록, 남이 호출하면 403. 소유 여부를 확정하는 결과가 아님 |
| POST | `/lost-reports` | 로그인 | 등록(multipart). 같은 사용자가 같은 내용(물품명·종류·분실 날짜·추정 위치)을 60초 안에 다시 보내면 409. `request`: `title*, categoryId*, lostDate*, lostEndDate(기간), lostBuildingId 또는 lostLocation*, lostLocationDetail, lostLatitude/lostLongitude, description, representativeImageIndex`. 접수 번호 `LR-000123` |
| PATCH | `/lost-reports/{id}` | 작성자 | 내용 수정(multipart). '찾기 완료'·'신고 종료' 상태면 409 |
| PATCH | `/lost-reports/{id}/status` | 작성자 | `{ status }` 찾는 중 ↔ 찾기 완료 ↔ 신고 종료 |
| DELETE | `/lost-reports/{id}` | 작성자 | Soft Delete |

## 5. 반환 신청 (로그인)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/found-items/{id}/return-requests/me` | 지금 신청할 수 있는지(`canRequest`), 못 하면 이유(`blockReason`), 내 최근 신청(`myRequest`) |
| POST | `/found-items/{id}/return-requests` | 신청. 본문 `{ ownershipDescription*(5~500자), additionalNote(~300자) }`. 신청 가능: 보관 중이거나 습득자 임시 보관 중인 신고 접수 건. 본인이 신고한 물품·같은 사람의 처리 중 신청이 있으면 409. 201 |
| PATCH | `/return-requests/{id}/cancel` | 신청자 본인이 취소(신청 대기일 때만, 아니면 409) |

중복 반환 방지: 물품 행에 비관적 잠금(`SELECT … FOR UPDATE`)을 걸고 최신 상태로 판단한다. 한 물품에서 승인은 한 건만 가능하다.

## 6. 기준 데이터 (비회원)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/categories` | 6종(전자기기, 지갑·카드, 열쇠, 의류·잡화, 도서·문구, 기타) |
| GET | `/campus-buildings` | 교내 건물(좌표는 시연용 설정값) |
| GET | `/storage-locations?buildingId=` | 사용 중인 공식 보관 장소(문의처·운영 시간·수령 안내 포함) |

## 7. 관리자 `/admin` (ROLE_ADMIN)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/admin/found-items` | 전체 습득물(숨김 포함, 삭제 제외). `keyword`(비공개 특징도 검색), `status`, `categoryId`, `page`, `size`. 응답에 비공개 특징, `allowedStatuses`(지금 바꿀 수 있는 상태), `pendingReturnRequests` |
| PATCH | `/admin/found-items/{id}/status` | `{ status }`: `REPORTED`·`STORED`·`HIDDEN`만. 반환 진행·완료는 반환 신청 처리로만 바뀐다. 처리 중인 신청이 있으면 숨길 수 없음(409) |
| PATCH | `/admin/found-items/{id}/storage` | 실제 보관 위치 지정 `{ custodyType, storageId \| storageLocation, storageLocationDetail, … }`. 전달 완료로 지정하면 '신고 접수'는 '보관 중'이 된다. 반환 완료 물품은 409 |
| PATCH | `/admin/found-items/{id}/found-location` | 발견 위치 수정 `{ foundBuildingId, foundLocation, foundLocationDetail, foundLatitude, foundLongitude }` |
| GET | `/admin/lost-reports` | 전체 분실 신고(모든 상태). `keyword`, `status`, `page`, `size` |
| PATCH | `/admin/lost-reports/{id}/status` | `{ status: SEARCHING\|FOUND\|CLOSED }` 관리자가 분실 신고의 상태만 바꾼다(내용은 그대로, 같은 상태면 409). 응답에 신고자 정보 없음 |
| GET | `/admin/return-requests` | 반환 신청(신청자 이메일·소유 확인 설명·습득자 비공개 특징·`allowedNext`). `status`, `page`, `size` |
| PATCH | `/admin/return-requests/{id}/status` | `{ status: APPROVED\|REJECTED\|COMPLETED, comment }`. 반려는 `comment` 필수. 대기→승인·반려, 승인→반환 완료·반려(승인 철회). 반환 완료 시 남은 대기 신청은 자동 반려 |
| POST | `/admin/campus-buildings` | 건물 등록 `{ buildingName, latitude, longitude, description }`(이름 중복·좌표 범위 검증) |
| PATCH | `/admin/campus-buildings/{id}` | 건물 수정 |
| GET | `/admin/storage-locations` | 사용 중지 포함 전체 보관 장소 |
| POST | `/admin/storage-locations` | 등록 `{ buildingId, storageName, latitude, longitude, detailLocation, description, contactPhone, operatingHours, pickupGuide, active }`(좌표 생략 시 건물 좌표) |
| PATCH | `/admin/storage-locations/{id}` | 수정(`active:false`로 사용 중지) |

## 8. 개발용 `/dev` (dev 프로필 + ADMIN)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/dev/reset-demo` | 시연 데이터 초기화(평가 과업을 같은 상태에서 시작하기 위함). 계정이 다시 만들어져 기존 로그인은 만료된다. dev 프로필이 아니면 이 경로 자체가 없다 |

## 9. 업로드 사진

`GET /uploads/{uuid}.{jpg|png|webp}` — 비회원 조회 가능(`image_url`로 응답에 포함).

---

## SPEC §20 대비 추가·변경한 경로

`GET /auth/check-email`, `GET /users/me/found-items/{id}`, `PATCH /lost-reports/{id}/status`, `PATCH /admin/lost-reports/{id}/status`, `GET /found-items/{id}/return-requests/me`, `PATCH /admin/found-items/{id}/found-location`, `GET /admin/storage-locations`, `POST /dev/reset-demo`. 이유는 `docs/REQUIREMENTS_TRACE.md` §3.
