<#
  배포 스모크 테스트: 주소 하나를 받아 핵심 경로가 살아 있는지 표로 보여 준다.

  사용:
    powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -BaseUrl http://localhost:8080
    powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1 -BaseUrl https://내-배포-주소 -SkipLogin

  확인 항목: 메인 페이지, 새로 고침이 필요한 화면 경로(/items, /map), 카테고리 API, 습득물 목록 API,
            시연 계정 로그인, 비회원의 보호 API 401, 로그아웃한 토큰의 401.
  시연 계정 비밀번호는 실행할 때 입력받는다(화면에 표시하지 않고 파일·기록에 저장하지 않는다).
  자동 실행에서는 현재 터미널의 환경변수 SMOKE_PASSWORD로 줄 수도 있다.
  종료 코드: 모두 통과 0, 하나라도 실패 1.
#>
param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [string]$Email = 'user1@demo.local',
  [switch]$SkipLogin,
  [int]$TimeoutSec = 90
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$results = New-Object System.Collections.Generic.List[object]

function Add-Result($name, $ok, $detail) {
  $results.Add([pscustomobject]@{ 항목 = $name; 결과 = $(if ($ok) { '통과' } else { '실패' }); 상세 = $detail })
}

function Invoke-Http($method, $path, $headers = @{}, $body = $null) {
  # 무료 플랫폼은 잠자기에서 깨어나는 데 1분쯤 걸릴 수 있어 시간 제한을 넉넉히 둔다
  $params = @{ Uri = "$BaseUrl$path"; Method = $method; Headers = $headers; UseBasicParsing = $true; TimeoutSec = $TimeoutSec }
  if ($null -ne $body) { $params.Body = $body; $params.ContentType = 'application/json; charset=utf-8' }
  try {
    $r = Invoke-WebRequest @params
    return [pscustomobject]@{ Status = [int]$r.StatusCode; Content = $r.Content; Headers = $r.Headers }
  } catch {
    $resp = $_.Exception.Response
    if ($null -ne $resp) {
      $content = ''
      try { $content = (New-Object System.IO.StreamReader($resp.GetResponseStream())).ReadToEnd() } catch { }
      return [pscustomobject]@{ Status = [int]$resp.StatusCode; Content = $content; Headers = $resp.Headers }
    }
    return [pscustomobject]@{ Status = 0; Content = $_.Exception.Message; Headers = @{} }
  }
}

Write-Host "스모크 테스트 대상: $BaseUrl"

# 1) 메인 페이지(index.html)
$r = Invoke-Http GET '/'
Add-Result '메인 페이지 GET /' (($r.Status -eq 200) -and ($r.Content -match 'id="root"')) "HTTP $($r.Status)"

# 2) 새로 고침이 필요한 화면 경로 → 404가 아니라 index.html
foreach ($p in '/items', '/map', '/items/1', '/mypage') {
  $r = Invoke-Http GET $p
  Add-Result "화면 경로 새로 고침 GET $p" (($r.Status -eq 200) -and ($r.Content -match 'id="root"')) "HTTP $($r.Status)"
}

# 3) 공개 API
$r = Invoke-Http GET '/api/v1/categories'
$ok = $false; $detail = "HTTP $($r.Status)"
if ($r.Status -eq 200) { $n = @(($r.Content | ConvertFrom-Json).data).Count; $ok = $n -ge 1; $detail = "HTTP 200, 카테고리 $n개" }
Add-Result 'GET /api/v1/categories' $ok $detail

$r = Invoke-Http GET '/api/v1/found-items'
$ok = $false; $detail = "HTTP $($r.Status)"
if ($r.Status -eq 200) { $t = ($r.Content | ConvertFrom-Json).data.totalElements; $ok = $true; $detail = "HTTP 200, 습득물 $t건" }
Add-Result 'GET /api/v1/found-items' $ok $detail

# 4) 비회원의 보호 API는 401
$r = Invoke-Http GET '/api/v1/users/me'
Add-Result '비회원 GET /api/v1/users/me → 401' ($r.Status -eq 401) "HTTP $($r.Status)"
$r = Invoke-Http GET '/api/v1/admin/found-items'
Add-Result '비회원 GET /api/v1/admin/found-items → 401' ($r.Status -eq 401) "HTTP $($r.Status)"
$r = Invoke-Http GET '/api/v1/없는경로/x'
Add-Result '없는 API는 HTML이 아니라 JSON 오류' (($r.Status -in 401, 404) -and ($r.Content -notmatch '<html')) "HTTP $($r.Status)"

# 5) 시연 계정 로그인 → 내 정보 → 로그아웃 → 같은 토큰 401
if ($SkipLogin) {
  Add-Result '시연 계정 로그인' $true '건너뜀(-SkipLogin)'
} else {
  if ($env:SMOKE_PASSWORD) {
    # 자동 실행용: 이 터미널 세션의 환경변수로만 받는다(파일에 저장하지 않는다)
    $plain = $env:SMOKE_PASSWORD
  } else {
    $secure = Read-Host "시연 계정($Email) 비밀번호" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  }
  $body = (@{ email = $Email; password = $plain } | ConvertTo-Json -Compress)
  $plain = $null
  $r = Invoke-Http POST '/api/v1/auth/login' @{} $body
  $body = $null
  $token = $null
  if ($r.Status -eq 200) { $token = ($r.Content | ConvertFrom-Json).data.accessToken }
  Add-Result "시연 계정 로그인 ($Email)" ($null -ne $token) "HTTP $($r.Status)"
  if ($null -ne $token) {
    $auth = @{ Authorization = "Bearer $token" }
    $r = Invoke-Http GET '/api/v1/users/me' $auth
    Add-Result '로그인 후 GET /api/v1/users/me' ($r.Status -eq 200) "HTTP $($r.Status)"
    $r = Invoke-Http POST '/api/v1/auth/logout' $auth
    Add-Result '로그아웃' ($r.Status -eq 200) "HTTP $($r.Status)"
    $r = Invoke-Http GET '/api/v1/users/me' $auth
    Add-Result '로그아웃한 토큰은 만료 전에도 401' ($r.Status -eq 401) "HTTP $($r.Status)"
  }
}

$results | Format-Table -AutoSize -Wrap | Out-String | Write-Host
$failed = @($results | Where-Object { $_.결과 -eq '실패' }).Count
Write-Host ("합계: {0} 통과 / {1} 실패" -f ($results.Count - $failed), $failed)
if ($failed -gt 0) { exit 1 } else { exit 0 }
