# syntax=docker/dockerfile:1
# That's Mine — 단일 서비스 이미지: React 빌드 결과를 Spring Boot가 함께 제공한다(같은 주소라 CORS 설정이 필요 없다).
#   docker build -t thats-mine --build-arg VITE_KAKAO_MAP_KEY=<키(선택)> .
#   docker run -p 8080:8080 -e DB_HOST=... -e DB_PASSWORD=... -e JWT_SECRET=... -e DEMO_ACCOUNT_PASSWORD=... thats-mine

# 1) 프론트 빌드 (Node)
FROM node:22-alpine AS frontend
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Kakao 지도 키는 빌드 인자로 받는다. 비워 두면 지도 대신 안내 + 건물별 목록 화면으로 동작한다.
ARG VITE_KAKAO_MAP_KEY=
ENV VITE_KAKAO_MAP_KEY=${VITE_KAKAO_MAP_KEY}
RUN npm run build

# 2) 백엔드 빌드 (Gradle) — 프론트 결과(frontend/dist)를 jar 안의 static/ 에 넣는다(-PwithFrontend)
FROM eclipse-temurin:17-jdk AS backend
WORKDIR /workspace/backend
COPY backend/ ./
# Windows에서 받은 소스의 줄 끝(CRLF)이 gradlew 실행을 막지 않게 한다
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew
COPY --from=frontend /workspace/frontend/dist /workspace/frontend/dist
RUN ./gradlew bootJar -PwithFrontend --no-daemon -x test

# 3) 실행 이미지 (JRE만)
FROM eclipse-temurin:17-jre
RUN useradd --system --create-home --home-dir /app appuser
WORKDIR /app
COPY --from=backend /workspace/backend/build/libs/app.jar /app/app.jar
RUN mkdir -p /app/uploads /app/logs && chown -R appuser:appuser /app
USER appuser

# 배포 시연 프로필(demo): JWT_SECRET·DEMO_ACCOUNT_PASSWORD·DB_* 는 환경변수로만 받는다(이미지에 비밀값 없음)
ENV SPRING_PROFILES_ACTIVE=demo \
    UPLOAD_DIR=/app/uploads \
    LOG_FILE=/app/logs/thatsmine.log \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
