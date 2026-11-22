# 배포 안내 (DEPLOY)

작성: 2026-11-22 (13단계). 다른 사람이 **주소 하나 또는 명령 하나**로 결과물을 볼 수 있게 하는 방법을 정리했다.

> **현재 상태: 배포 확인 대기.** 실제 배포(플랫폼 가입·환경변수 입력·배포 실행)는 사용자가 직접 해야 하는 일이라 하지 않았다. 아직 배포 주소가 없고(`docs/DEPLOY_URL.txt` 없음), 배포했다고 쓰지 않는다. 아래 "검증 기록"에 **실제로 실행한 것과 실행하지 못한 것**을 구분해 적었다.

## 1. 배포 형태

React 빌드 결과를 Spring Boot가 함께 제공하는 **단일 서비스**다. 주소가 하나라 CORS 설정이 필요 없고, Kakao 허용 도메인도 하나만 등록하면 된다.

```
브라우저 ──► Spring Boot (포트 8080 또는 플랫폼의 PORT)
              ├─ /api/**        REST API
              ├─ /uploads/**    업로드한 사진
              └─ 그 밖의 GET     React 화면(index.html·정적 파일). /items 등 화면 주소를 새로 고쳐도 index.html
              └─ DB: MySQL 호환(환경변수 DB_*)
```

- `Dockerfile`(루트): Node로 프론트 빌드 → Gradle로 jar 빌드(`-PwithFrontend`로 프론트 결과를 jar의 `static/`에 포함) → JRE 이미지로 실행. 기본 프로필은 `demo`.
- **`demo` 프로필**(배포 시연용, `application-demo.yml`): `JWT_SECRET` 필수, SQL 로그 끔, H2 콘솔 없음, 시연 데이터는 **DB가 비어 있을 때만** 만들고(`[시연용]` 표시) 재시작해도 중복 생성하지 않는다. 시연 계정 비밀번호는 환경변수 `DEMO_ACCOUNT_PASSWORD`로만 받고 기본값이 없다(없거나 8자 미만이면 서버가 한국어 안내와 함께 시작하지 않는다). 시연 데이터 초기화(`POST /api/v1/dev/reset-demo`)는 관리자만 호출할 수 있다.
- 비밀값(DB 비밀번호, JWT 키, 시연 계정 비밀번호)은 이미지·저장소에 없고 환경변수로만 들어간다.

## 2. 추천 조합 (2026-11-22에 공식 문서로 확인)

**추천: Render(Docker 웹 서비스, 무료) + TiDB Cloud Starter(MySQL 호환 DB, 무료)**

| 항목 | Render 무료 웹 서비스 | TiDB Cloud Starter |
|---|---|---|
| 역할 | Docker 이미지를 빌드·실행(이 저장소의 `Dockerfile`, `render.yaml`) | MySQL 호환 관리형 DB |
| 무료 한도 | 워크스페이스당 월 750 무료 인스턴스 시간 | 인스턴스당 행 저장소 5 GiB·월 5천만 RU. 무료 인스턴스 최대 5개 |
| 잠자기 | **15분간 요청이 없으면 잠듦**, 다시 깨어나는 데 약 1분 | 한도를 다 쓰면 새 연결을 거절(월초에 초기화) |
| 디스크 | **재시작·재배포 때 로컬 파일이 사라짐**(무료는 영구 디스크 불가) | — |
| 연결 | — | **TLS 필수**(공개 엔드포인트), Connector/J 8.0.22 이상 |

선택 근거: 단일 Docker 서비스를 무료로 돌릴 수 있고, Render는 MySQL을 제공하지 않아 외부 MySQL 호환 DB가 필요한데 TiDB Cloud Starter는 MySQL 프로토콜을 지원하는 무료 한도가 있다. 같은 이유로 **Aiven의 무료 MySQL은 추천하지 않는다**(2026-11-06부터 신규 생성 불가, 2026-12-21에 종료).

**주의(확인하지 못한 점)**: TiDB는 MySQL "호환"이지 MySQL이 아니다. 이 프로젝트의 Flyway 마이그레이션(V1~V4)을 **TiDB에서 실행해 보지 않았다**(MySQL 26.10에서만 확인). 첫 배포 때 로그에서 Flyway 성공 여부를 반드시 확인하고, 실패하면 아래 대안을 쓴다.

**대안: Railway(앱 + 진짜 MySQL을 한 프로젝트에)**
- 무료 플랜은 월 $1 사용량, 신규 계정은 30일 동안 $5 체험 크레딧. MySQL을 데이터베이스로 만들 수 있고 유휴 시 잠든다. 유료(Hobby)는 월 $5. 한도가 작아 시연 기간에만 쓰기 좋다.
- 진짜 MySQL이라 Flyway 호환 위험이 가장 작다. Dockerfile 배포는 Railway 문서에서 현재 방식을 확인하세요(이번 조사에서 확인하지 못함).

공식 문서(2026-11-22 확인, 조건은 자주 바뀌므로 가입 전에 다시 확인하세요):
- [Render: Deploy for Free](https://render.com/docs/free), [Render: Docker on Render](https://render.com/docs/docker), [Render: Using Secrets with Docker](https://render.com/docs/docker-secrets)
- [TiDB Cloud Starter 요금](https://www.pingcap.com/tidb-cloud-starter-pricing-details/), [TiDB Cloud Starter FAQ](https://docs.pingcap.com/tidbcloud/serverless-faqs/), [Connect to TiDB with JDBC](https://docs.pingcap.com/tidbcloud/dev-guide-sample-application-java-jdbc/)
- [Aiven for MySQL 무료 플랜 종료 안내](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)
- [Railway 요금 플랜](https://docs.railway.com/pricing/plans), [Railway 무료 플랜](https://docs.railway.com/pricing/free-plan)

## 3. 환경변수

| 이름 | 설명 | 예시 형식 | 필수 | 만드는 방법 |
|---|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | 실행 프로필 | `demo` | Dockerfile·render.yaml에 이미 `demo` | — |
| `DB_HOST` | DB 주소 | `gateway01.<리전>.prod.aws.tidbcloud.com` | 필수 | DB 서비스 콘솔의 연결 정보 |
| `DB_PORT` | DB 포트 | TiDB `4000`, MySQL `3306` | 필수(기본 3306) | 콘솔의 연결 정보 |
| `DB_NAME` | DB 이름 | `thatsmine` | 필수 | 콘솔에서 만들거나 `CREATE DATABASE thatsmine CHARACTER SET utf8mb4;` |
| `DB_USER` | DB 사용자 | TiDB는 `접두사.root` 형태 | 필수 | 콘솔의 연결 정보 |
| `DB_PASSWORD` | DB 비밀번호 | (콘솔이 알려 줌) | 필수 | 콘솔에서 생성·확인. **저장소에 적지 않는다** |
| `DB_OPTIONS` | JDBC URL 뒤에 붙일 연결 옵션(`&`로 시작) | `&sslMode=VERIFY_IDENTITY&tlsVersions=TLSv1.2,TLSv1.3` | TLS가 필요한 DB는 필수 | TiDB Cloud는 TLS 필수. 로컬 MySQL은 비움 |
| `JWT_SECRET` | 로그인 토큰 서명 비밀키(32자 이상) | 무작위 문자열 | **필수**(없으면 시작 안 함) | PowerShell: `[Convert]::ToBase64String((1..48 \| ForEach-Object { Get-Random -Max 256 }))` |
| `DEMO_ACCOUNT_PASSWORD` | 시연 계정(`admin@demo.local`, `user1@demo.local`, `user2@demo.local`) 비밀번호, 8자 이상 | 직접 정함 | **필수**(없으면 시작 안 함) | 직접 정한다. 제출할 때 따로 전달한다 |
| `VITE_KAKAO_MAP_KEY` | Kakao JavaScript 키(지도). **빌드 때** 화면에 들어간다 | Kakao 개발자 콘솔의 JavaScript 키 | 선택(비우면 지도 대신 안내와 건물별 목록) | 아래 4번. 이 키는 브라우저에 보이는 공개 키라서 허용 도메인으로 보호한다 |
| `PORT` | 서버 포트 | `10000` | 플랫폼이 설정 | Render가 자동으로 넣는다(없으면 8080) |
| `UPLOAD_DIR` | 업로드 사진 폴더 | `/app/uploads` | 선택 | 이미지의 기본값이 이미 설정됨 |
| `JWT_EXPIRATION` | 토큰 유효 시간(ms) | `86400000` | 선택 | 기본 24시간 |

## 4. 사용자가 직접 할 일 (Render + TiDB Cloud 기준, 순서대로)

계정 생성·로그인·결제 정보 입력·비밀값 입력은 **사용자가 직접** 한다(Claude Code가 하지 않는다).

1. **코드를 GitHub에 올린다.** 원격(`origin`)은 이미 `https://github.com/bestash1278/That-s-Mine.git`로 연결돼 있다. 저장소를 **공개로 할지 비공개로 할지는 직접 정한다**(GitHub 저장소 설정 → Change visibility). 아직 push하지 않았다면 `git push origin master`(저장소 기본 브랜치 이름은 `master`다).
2. **비밀값을 준비한다.** `JWT_SECRET`을 위 명령으로 만들고, `DEMO_ACCOUNT_PASSWORD`를 정한다. 안전한 곳(비밀번호 관리자)에 적어 두고 저장소·채팅에 붙여 넣지 않는다.
3. **TiDB Cloud Starter 인스턴스를 만든다.** 가입 → Starter 인스턴스 생성(리전 선택) → Connect 화면에서 host·port·user·password를 확인 → SQL 편집기에서 `CREATE DATABASE thatsmine CHARACTER SET utf8mb4;` 실행.
4. **Render에서 서비스를 만든다.** 가입(GitHub 연동) → New → Blueprint → 이 저장소 선택(루트의 `render.yaml`을 읽는다). 또는 New → Web Service → Docker → 이 저장소.
5. **환경변수를 입력한다.** `render.yaml`에서 `sync: false`인 항목(`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_OPTIONS`, `JWT_SECRET`, `DEMO_ACCOUNT_PASSWORD`, `VITE_KAKAO_MAP_KEY`)을 위 3번 표대로 대시보드에 입력한다. `DB_PORT`는 TiDB `4000`이 기본으로 들어 있다.
6. **배포를 실행한다.** 첫 빌드는 Node·Gradle 의존성을 받아 몇 분 걸린다. 배포가 끝나면 `https://<서비스 이름>.onrender.com` 주소가 생긴다.
7. **Kakao 허용 도메인을 추가한다**(지도를 쓸 때). [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → 앱 설정의 **플랫폼 → Web**에 위 주소를 사이트 도메인으로 추가한다. 키를 나중에 넣거나 바꾸면 환경변수를 고친 뒤 **다시 배포**해야 한다(빌드 때 들어가므로). 지도를 안 쓰면 이 단계는 건너뛴다.
8. **첫 배포 후 확인 순서**
   1. Render 로그에서 `Migrating schema ... to version "4 - revoked tokens"`와 `Started ThatsMineApplication`을 확인한다. Flyway 오류가 나면(특히 TiDB) 로그를 보관하고 대안(Railway)으로 바꾼다.
   2. 주소를 열어 홈 화면이 나오는지 확인한다(처음에는 잠에서 깨는 데 1분쯤 걸릴 수 있다).
   3. `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -BaseUrl https://<주소>` 를 실행한다(시연 계정 비밀번호는 실행할 때 입력한다).
   4. `user2@demo.local`로 로그인해 마이페이지, 과업 A(`파란색 파우치` 검색 → 상세)를 직접 확인한다.
9. **주소를 기록한다.** `docs/DEPLOY_URL.txt`에 주소 한 줄을 적고, `scripts/smoke-test.ps1` 결과를 아래 "배포 확인 결과"에 붙이거나 `run-all.ps1 -From 13 -To 13`을 다시 실행해 기록하게 한다.

## 5. 로컬에서 공유하기 (docker compose)

Docker Desktop이 있으면 한 번에 실행된다.

```powershell
Copy-Item .env.example .env          # .env 에 DB_PASSWORD, JWT_SECRET, DEMO_ACCOUNT_PASSWORD 를 채운다(.env는 저장소에 올라가지 않는다)
docker compose up --build            # MySQL 8.4 + 앱. 첫 빌드는 몇 분
# → http://localhost:8080
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -BaseUrl http://localhost:8080
```

Docker 없이 같은 결과물을 확인하려면 `powershell -ExecutionPolicy Bypass -File .\scripts\build-single.ps1`로 `backend\build\libs\app.jar`를 만들고, 환경변수를 설정한 뒤 `java -Dspring.profiles.active=demo -jar backend\build\libs\app.jar`를 실행한다(MySQL이 필요하다).

## 6. 한계

- **Render 무료 플랜은 15분 동안 요청이 없으면 잠들고(깨우는 데 약 1분), 로컬 파일이 재시작·재배포 때 사라진다.** 그래서 사용자가 올린 **사진 파일이 사라진다**(DB의 사진 기록은 남아 이미지가 깨져 보인다). 시연 데이터에는 사진이 없고 평가 과업 B도 사진 선택 동작만 보는 용도라 시연에는 영향이 작지만, 사진을 오래 보존하려면 영구 디스크(유료 플랜) 또는 외부 저장소가 필요하다(이 프로젝트에는 구현되어 있지 않다).
- 무료 플랜의 월 750시간이 끝나면 서비스가 정지된다. 평가 직전에 한 번 열어 두는 것이 안전하다.
- 중복 제출 방지는 서버 한 대 기준이다. Render 무료는 한 대라 문제없지만 여러 대로 늘리면 DB 제약이 필요하다.
- 시연 데이터 초기화는 관리자 API뿐이고 화면 버튼은 없다(요청에 따라 만들지 않음). 시연 계정은 DB가 비었을 때 한 번 만들어진다. 비밀번호를 바꾸려면 `reset-demo`(관리자로 로그인해 호출) 또는 DB를 비우고 새 비밀번호로 재시작해야 한다.
- TiDB Cloud Starter에서의 Flyway 동작, Render 환경에서의 실제 빌드는 **확인하지 못했다**.
- Kakao 키는 화면 번들에 들어가는 공개 키다. 반드시 허용 도메인으로 제한한다.

## 7. 검증 기록 (2026-11-22)

실제로 실행한 것:

| 항목 | 결과 |
|---|---|
| `scripts/build-single.ps1`(프론트 `npm ci`·`npm run build` + `gradlew bootJar -PwithFrontend`) | 성공, `app.jar` 58.5 MB(프론트 포함) |
| `demo` 프로필 + `DEMO_ACCOUNT_PASSWORD` 없이 실행 | 시작 실패 + 한국어 안내(환경변수 이름 포함) 확인 |
| `demo` 프로필로 jar 실행(MySQL 26.10, 빈 DB `thatsmine_demo`) | 시작 성공, 시연 데이터 14건·계정 3개 생성. 재시작하면 건수 그대로(중복 생성 안 함) |
| `scripts/smoke-test.ps1 -BaseUrl http://localhost:8080` | **14 통과 / 0 실패**: 메인 페이지, `/items`·`/map`·`/items/1`·`/mypage` 새로 고침(200), `GET /api/v1/categories`, `GET /api/v1/found-items`, 비회원 보호 API 401 2건, 없는 API는 JSON 오류, 시연 계정 로그인·내 정보·로그아웃·로그아웃한 토큰 401 |
| 브라우저(헤드리스 Chrome)로 `http://localhost:8080`의 `/`, `/items`, `/items/1`, `/map`, `/login`을 직접 열기 | 모두 화면과 제목이 나오고 콘솔 오류 없음 |
| 비회원이 `POST /api/v1/dev/reset-demo` | 401 |
| SPA 라우팅·demo 프로필 JUnit(`SpaRoutingTest`, `DemoProfileGuardTest`) | 통과(화면 경로 17개 forward, 없는 API는 JSON 401, 없는 파일·업로드는 404) |

실행하지 못한 것:

| 항목 | 이유 |
|---|---|
| `docker build`·`docker compose up` | 이 PC에 Docker가 설치되어 있지 않다(`docker: command not found`). `Dockerfile`·`docker-compose.yml`은 문법·구성을 점검하지 못했고, 같은 단계를 Gradle(`build-single.ps1`)로 대신 확인했다 |
| Render·TiDB Cloud 배포와 Flyway 동작 | 가입·결제·비밀값 입력은 사용자 작업. 배포하지 않았다 |
| 배포 주소에 대한 스모크 테스트 | 배포 주소가 없다 |

## 8. 배포 확인 결과

**배포 확인 대기** — 사용자가 위 4번을 마치고 `docs/DEPLOY_URL.txt`에 주소를 적은 뒤 스모크 테스트를 실행하면 이 칸에 결과를 기록한다.

| 일시 | 주소 | 스모크 테스트 결과 |
|---|---|---|
| (대기) | (배포 후 입력) | (대기) |
