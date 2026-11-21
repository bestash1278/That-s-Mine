# 버전 호환성 수정 (1~2단계 결과물 보정)

CLAUDE.md의 "버전 기준"과 "시간대" 절을 읽고, 이미 생성된 파일을 아래대로 수정해줘. 기능 코드(entity, repository, service, DataInitializer, V1__init.sql 내용)는 버전 문제 때문에 고쳐야 하는 부분만 바꾸고 나머지는 유지해.

## 백엔드
1. `backend/build.gradle`
   - Spring Boot 플러그인 3.4.0 → 3.5.16, dependency-management 1.1.6 → 1.1.7
   - `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }`
   - `implementation 'mysql:mysql-connector-java:8.0.33'` 삭제 → `runtimeOnly 'com.mysql:mysql-connector-j'`
   - jjwt 0.12.3 → 0.13.0(세 모듈 모두)
   - `testRuntimeOnly 'org.junit.platform:junit-platform-launcher'` 추가
2. Gradle Wrapper가 없다. Wrapper 8.14.x를 생성해서 `gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`, `gradle-wrapper.properties`를 커밋해.
   - PC에 gradle이 있으면 `gradle wrapper --gradle-version 8.14.3`을 쓴다
   - 없으면 start.spring.io에서 같은 설정(Gradle-Groovy, Boot 3.5.16, Java 17)의 프로젝트를 받아 wrapper 파일만 복사한다
   - 둘 다 안 되면 멈추고 PROGRESS.md에 이유를 적어
3. `application.yml`
   - `database-platform: org.hibernate.dialect.MySQL8Dialect` 줄 삭제(자동 감지)
   - JDBC URL의 `serverTimezone=UTC` → `serverTimezone=Asia/Seoul`, `spring.jpa.properties.hibernate.jdbc.time_zone: Asia/Seoul` 추가
   - `ThatsMineApplication.main`에서 `TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"))`
   - `jwt.secret` 기본값이 비어 있으면 기동 시 명확한 한국어 오류를 내도록 검증 추가(dev/test 프로필은 테스트용 고정 키 허용, 그 키는 yml에만 두고 운영 키로 쓰지 말라는 주석 추가)
4. `application-test.yml`을 `src/main/resources` → `src/test/resources`로 옮긴다(운영 jar에 포함되지 않게).
   - 가능하면 test에서도 Flyway를 켜고(`flyway.enabled: true`) `ddl-auto: validate`로 바꿔서 V1__init.sql이 실제로 검증되게 한다
   - H2(MODE=MySQL)에서 V1 SQL이 깨지면 SQL을 양쪽 호환 문법으로 고친다. 정말 불가능한 구문만 남으면 원래 설정(create-drop)으로 되돌리고 이유를 기록해
   - `H2Dialect` 명시는 삭제
5. `backend/src/main/java/com/thatsmine/{entity,dto,enums,repository,service,controller,config,security,exception,util}` 처럼 중괄호가 이름에 그대로 들어간 잘못된 폴더를 삭제한다(Windows에서 brace expansion이 안 돼서 생긴 것). 안에 파일이 있으면 올바른 패키지로 옮긴 뒤 삭제한다. 빈 `dto`, `security`, `exception`, `util` 패키지 폴더가 필요하면 만든다.
6. `cd backend; .\gradlew.bat clean build`를 실제로 실행해서 컴파일과 테스트가 통과할 때까지 고친다.

## 프론트엔드
7. `package.json`
   - devDependencies에 `jsdom` 추가(vitest 환경이 jsdom인데 설치돼 있지 않음)
   - `@testing-library/dom`을 devDependencies에 명시
   - `tailwindcss`, `postcss`, `autoprefixer`를 dependencies → devDependencies로 옮긴다
   - TypeScript를 쓰지 않으므로 `@types/react`, `@types/react-dom`은 지운다(lucide-react가 optional peer로 요구하는 경고는 무시해도 됨)
   - `"engines": { "node": ">=22.12" }` 추가
   - `"test": "vitest run"`(CI·자동 실행에서 watch 모드로 멈추지 않게), `"test:watch": "vitest"` 추가
8. `src/index.css`가 아직 Vite 템플릿 그대로다(보라색 accent, 다크모드, `color-scheme: light dark`). 내용을 지우고 `@tailwind base; @tailwind components; @tailwind utilities;`와 CLAUDE.md 색상 기준의 기본 스타일(body 배경 #F5F7FA, 글자 #1F2937, 라이트 모드만)로 바꾼다. `App.css`, `assets/hero.png`, `react.svg`, `vite.svg` 같은 템플릿 잔재와 템플릿 `App.jsx` 내용도 정리한다.
9. `tailwind.config.js` 색상 키 `text`, `bg`는 Tailwind 유틸리티 이름과 헷갈린다(`text-text`, `bg-bg`). `ink`(본문), `ink-sub`(보조), `surface`(배경) 같은 이름으로 바꾸고 CLAUDE.md의 색상 표기도 맞춘다.
10. `vitest.config.js`를 별도로 두지 말고 `vite.config.js`의 `test` 필드로 합치거나, 둘을 유지한다면 alias가 양쪽에서 같게 한다.
11. `npm install` → `npm run build` → `npm run lint` → `npm test`를 실제로 실행하고 통과시킨다. 최소 1개의 컴포넌트 테스트(App 렌더링)를 둔다.

## 마무리
- 바꾼 버전과 이유를 docs/PROGRESS.md에 "버전 보정" 항목으로 기록하고 커밋해("버전 호환성 보정").
- 실행한 명령과 실제 결과를 보고해. 실패한 것을 성공으로 쓰지 마.
- 마지막 줄은 `PHASE_RESULT: SUCCESS` 또는 `PHASE_RESULT: FAILED - 이유`
