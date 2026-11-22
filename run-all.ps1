<#
  That's Mine — Claude Code 단계별 자동 실행 스크립트

  사용법 (프로젝트 폴더에서):
    powershell -ExecutionPolicy Bypass -File .\run-all.ps1              # 0~13단계 전체
    powershell -ExecutionPolicy Bypass -File .\run-all.ps1 -From 5      # 5단계부터 재개
    powershell -ExecutionPolicy Bypass -File .\run-all.ps1 -From 3 -To 3  # 3단계만

  동작:
    prompts\NN.md 를 순서대로 claude -p 로 실행한다. 단계마다 새 세션이며,
    규칙은 CLAUDE.md, 진행 기록은 docs\PROGRESS.md 로 이어진다.
    각 단계의 마지막 줄이 "PHASE_RESULT: SUCCESS" 가 아니면 멈춘다.
    로그: logs\phase-NN.jsonl(전체 이벤트), logs\phase-NN-result.md(최종 응답)
#>
param(
  [int]$From = 0,
  [int]$To = 13,
  [ValidateSet('auto', 'acceptEdits', 'bypassPermissions')]
  [string]$PermissionMode = 'auto',
  [string]$Model = '',
  [int]$MaxTurns = 0,
  [switch]$ContinueOnFailure,
  [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = $utf8
[Console]::OutputEncoding = $utf8
[Console]::InputEncoding = $utf8

$root = $PSScriptRoot
Set-Location -LiteralPath $root
$promptDir = Join-Path $root 'prompts'
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Step($msg) { Write-Host "`n==== $msg ====" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[주의] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[실패] $msg" -ForegroundColor Red }

function Get-CmdOutput([string]$cmdLine) {
  # stderr로 버전을 출력하는 도구(java 등)를 안전하게 읽기 위해 cmd를 거친다
  $out = cmd /c "$cmdLine 2>&1"
  return ($out | Out-String).Trim()
}

# ---------- 사전 점검 ----------
if (-not $SkipChecks) {
  Write-Step '환경 점검'
  $missing = @()

  if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Fail "claude 명령을 찾을 수 없습니다. 설치 후 새 PowerShell 창에서 다시 실행하세요."
    exit 1
  }
  Write-Host ("claude : " + (Get-CmdOutput 'claude --version'))

  if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host ("git    : " + (Get-CmdOutput 'git --version'))
    $gitName = Get-CmdOutput 'git config --global user.name'
    if (-not $gitName) {
      Write-Warn 'git user.name이 설정되지 않아 커밋이 실패할 수 있습니다.'
      Write-Host '        git config --global user.name "이름"'
      Write-Host '        git config --global user.email "메일"'
    }
  } else { $missing += 'Git (https://git-scm.com/download/win)' }

  if (Get-Command java -ErrorAction SilentlyContinue) {
    $jv = Get-CmdOutput 'java -version'
    Write-Host ("java   : " + ($jv -split "`n")[0])
    if ($jv -match 'version "(\d+)') {
      if ([int]$Matches[1] -lt 17) { $missing += "Java 17 이상 (현재 $($Matches[1]))" }
    }
  } else { $missing += 'Java 17 JDK (예: Eclipse Temurin 17)' }

  if (Get-Command node -ErrorAction SilentlyContinue) {
    $nv = Get-CmdOutput 'node -v'
    Write-Host ("node   : " + $nv)
    if ($nv -match 'v(\d+)\.(\d+)') {
      $maj = [int]$Matches[1]; $min = [int]$Matches[2]
      if ($maj -lt 22 -or ($maj -eq 22 -and $min -lt 12)) { $missing += "Node.js 22.12 이상 또는 24 LTS (현재 $nv, Vitest 5 요구사항)" }
    }
  } else { $missing += 'Node.js 24 LTS (https://nodejs.org)' }

  if (Get-Command mysql -ErrorAction SilentlyContinue) {
    Write-Host ("mysql  : " + (Get-CmdOutput 'mysql --version'))
  } else {
    Write-Warn 'mysql 명령이 없습니다. 자동 테스트는 H2로 진행되지만, 실제 실행(bootRun)에는 MySQL 8이 필요합니다.'
  }

  if ($missing.Count -gt 0) {
    Write-Fail '다음 도구를 먼저 설치하세요:'
    $missing | ForEach-Object { Write-Host "  - $_" }
    exit 1
  }
}

$rulesRel = 'prompts\_auto-rules.md'
if (-not (Test-Path -LiteralPath (Join-Path $root $rulesRel))) {
  Write-Fail "$rulesRel 파일이 없습니다."; exit 1
}

# ---------- 단계 실행 ----------
function Invoke-Phase([int]$n) {
  $file = Join-Path $promptDir ('{0:D2}.md' -f $n)
  if (-not (Test-Path -LiteralPath $file)) { Write-Warn "프롬프트 파일 없음: $file (건너뜀)"; return $true }

  $promptText = [System.IO.File]::ReadAllText($file, $utf8)
  $title = ($promptText -split "`n")[0].TrimStart('#', ' ').Trim()
  Write-Step "$title  (시작 $(Get-Date -Format 'HH:mm:ss'))"

  $jsonl = Join-Path $logDir ('phase-{0:D2}.jsonl' -f $n)
  $resultFile = Join-Path $logDir ('phase-{0:D2}-result.md' -f $n)
  if (Test-Path -LiteralPath $jsonl) { Remove-Item -LiteralPath $jsonl }

  $claudeArgs = @(
    '-p', '표준 입력으로 받은 단계 지시를 CLAUDE.md 규칙에 따라 끝까지 수행해줘.',
    '--permission-mode', $PermissionMode,
    '--append-system-prompt-file', $rulesRel,
    '--output-format', 'stream-json',
    '--verbose'
  )
  if ($Model) { $claudeArgs += @('--model', $Model) }
  if ($MaxTurns -gt 0) { $claudeArgs += @('--max-turns', "$MaxTurns") }

  $script:finalText = ''
  $script:isError = $true
  $sw = [Diagnostics.Stopwatch]::StartNew()

  $prevPref = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $null = $promptText | & claude @claudeArgs 2>&1 | ForEach-Object {
    $line = "$_"
    [System.IO.File]::AppendAllText($jsonl, $line + "`n", $utf8)
    $evt = $null
    try { $evt = $line | ConvertFrom-Json } catch { Write-Host $line -ForegroundColor DarkGray; return }
    switch ($evt.type) {
      'assistant' {
        foreach ($c in $evt.message.content) {
          if ($c.type -eq 'text' -and $c.text.Trim()) {
            Write-Host ($c.text.Trim()) -ForegroundColor Gray
          } elseif ($c.type -eq 'tool_use') {
            $detail = ''
            if ($c.input.command) { $detail = $c.input.command }
            elseif ($c.input.file_path) { $detail = $c.input.file_path }
            if ($detail.Length -gt 120) { $detail = $detail.Substring(0, 120) + '…' }
            Write-Host ("  ▸ {0} {1}" -f $c.name, $detail) -ForegroundColor DarkCyan
          }
        }
      }
      'result' {
        $script:finalText = [string]$evt.result
        $script:isError = [bool]$evt.is_error
        $cost = if ($evt.total_cost_usd) { ' · 추정 비용 $' + [math]::Round($evt.total_cost_usd, 2) } else { '' }
        Write-Host ("  [결과] 턴 {0}{1}" -f $evt.num_turns, $cost) -ForegroundColor DarkGray
      }
    }
  }
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $prevPref
  $sw.Stop()

  [System.IO.File]::WriteAllText($resultFile, $script:finalText, $utf8)
  $elapsed = '{0:hh\:mm\:ss}' -f $sw.Elapsed

  $lastLine = (($script:finalText.Trim()) -split "`n")[-1].Trim()
  if ($exitCode -eq 0 -and -not $script:isError -and $lastLine -match '^PHASE_RESULT:\s*SUCCESS') {
    Write-Host "✔ $n단계 완료 ($elapsed)" -ForegroundColor Green
    return $true
  }
  Write-Fail "$n단계가 성공으로 끝나지 않았습니다 ($elapsed, 종료코드 $exitCode)."
  Write-Host "  마지막 줄: $lastLine"
  Write-Host "  최종 응답: $resultFile"
  Write-Host "  전체 로그: $jsonl"
  return $false
}

$total = [Diagnostics.Stopwatch]::StartNew()
for ($i = $From; $i -le $To; $i++) {
  $ok = Invoke-Phase $i
  if (-not $ok -and -not $ContinueOnFailure) {
    Write-Host "`n문제를 확인·수정한 뒤 다음 명령으로 이어서 실행하세요:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\run-all.ps1 -From $i"
    Write-Host "직접 대화로 고치려면:  claude --continue"
    exit 1
  }
}
$total.Stop()
Write-Step ("전체 완료 ({0:hh\:mm\:ss}). docs\PROGRESS.md 와 docs\TEST_RESULTS.md 를 확인하세요." -f $total.Elapsed)
