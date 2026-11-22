<#
  Docker 없이 단일 서비스 jar를 만든다(프론트 빌드 결과를 jar 안에 포함).
    powershell -ExecutionPolicy Bypass -File .\scripts\build-single.ps1
  결과: backend\build\libs\app.jar  — 실행 예(demo 프로필, 비밀값은 환경변수로):
    $env:DB_PASSWORD="..."; $env:JWT_SECRET="..."; $env:DEMO_ACCOUNT_PASSWORD="..."; $env:DB_NAME="thatsmine_demo"
    java -Dspring.profiles.active=demo -jar backend\build\libs\app.jar
  Kakao 키를 넣으려면 실행 전에 $env:VITE_KAKAO_MAP_KEY="키" 를 설정한다(비워 두면 대체 화면).
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $root 'frontend')
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci 실패' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build 실패' }
} finally { Pop-Location }

Push-Location (Join-Path $root 'backend')
try {
  .\gradlew.bat bootJar -PwithFrontend -x test
  if ($LASTEXITCODE -ne 0) { throw 'gradlew bootJar 실패' }
} finally { Pop-Location }

$jar = Join-Path $root 'backend\build\libs\app.jar'
Write-Host "만들었습니다: $jar ($([math]::Round((Get-Item $jar).Length / 1MB, 1)) MB)"
