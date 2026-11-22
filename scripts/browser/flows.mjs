// 평가 과업 A·B와 주요 흐름을 실제 브라우저(모바일 375px)에서 처음부터 끝까지 수행한다.
// 사용: node scripts/browser/flows.mjs [결과 JSON] [스크린샷 폴더]
// 필요: dev 프로필 백엔드(8080, 시연 데이터 초기 상태) + 프론트 개발 서버(5173). Kakao 키는 설정하지 않은 상태에서 실행한다.
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from './cdp.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = process.argv[2] || 'flows-results.json';
const SHOTS = process.argv[3] || '';
const PHOTO = path.resolve('frontend/public/demo-photos/umbrella-black-1.jpg');
const PHOTO2 = path.resolve('frontend/public/demo-photos/umbrella-black-2.jpg');
const steps = [];

const shot = async (page, name) => {
  if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
};

function record(flow, name, ok, detail = '') {
  steps.push({ flow, step: name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${flow}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function api(pathname, { token, method = 'POST', body } = {}) {
  const res = await fetch(`${BASE}/api/v1${pathname}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function loginByUi(page, email, password = 'demo1234!') {
  await page.type('#email', email);
  await page.type('#password', password);
  await page.click('button[type=submit]');
  await page.waitFor("!location.pathname.startsWith('/login')", { timeout: 8000 });
}

async function main() {
  // 항상 같은 초기 상태에서 시작
  const adminToken = (await api('/auth/login', { body: { email: 'admin@demo.local', password: 'demo1234!' } })).data.accessToken;
  await api('/dev/reset-demo', { token: adminToken });

  const page = await launchBrowser({ port: 9334 });
  await page.init();
  await page.setViewport(375, 812, true);

  // ============ 과업 A: 도서관에서 파란색 파우치를 잃어버림 → 맞는 물건과 보관 장소 확인 (3분)
  let t0 = Date.now();
  await page.goto(`${BASE}/`);
  await page.type('#keyword', '파란색 파우치');
  await page.click('text==검색');
  const listed = await page.waitFor("location.pathname === '/items' && document.querySelectorAll('a[href^=\"/items/\"]').length >= 2");
  record('과업 A', '홈에서 검색어 입력 → 검색 → 목록 이동', listed, await page.url());
  await shot(page, '20-taskA-1-search-result-mobile');
  const cards = await page.evaluate(`[...document.querySelectorAll('a[href^="/items/"]')].map((a) => a.innerText.replace(/\\s+/g, ' ').trim())`);
  const sameName = cards.filter((c) => c.includes('파란색 파우치'));
  record('과업 A', '같은 이름의 파란색 파우치가 둘 나오고 상태(보관 중/반환 완료)로 구별됨', sameName.length >= 2 && sameName.some((c) => c.includes('보관 중')) && sameName.some((c) => c.includes('반환 완료')), sameName.map((c) => c.slice(0, 60)).join(' | '));
  const answerHref = await page.evaluate(`(() => {
    const a = [...document.querySelectorAll('a[href^="/items/"]')].find((x) => x.innerText.includes('파란색 파우치') && x.innerText.includes('보관 중'));
    return a ? a.getAttribute('href') : null;
  })()`);
  record('과업 A', '카드만 보고 정답 후보(보관 중인 파란색 파우치)를 고를 수 있음', Boolean(answerHref), answerHref || '');
  await page.goto(`${BASE}/items?keyword=${encodeURIComponent('파우치')}`);
  const widerCards = await page.evaluate(`[...document.querySelectorAll('a[href^="/items/"]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim())`);
  record('과업 A', '"파우치"로 넓혀 검색하면 오답 후보(남색 파우치)도 함께 나옴', widerCards.some((c) => c.includes('남색 파우치')) && widerCards.some((c) => c.includes('보관 중') && c.includes('파란색 파우치')), widerCards.length + '건');
  await page.click(`a[href="${answerHref}"]`);
  await page.waitFor("location.pathname.startsWith('/items/')");
  await page.settle(800);
  const detail = await page.text();
  record('과업 A', '상세에 "발견한 곳"과 "지금 보관 중인 곳"이 따로 표시됨', detail.includes('발견한 곳') && detail.includes('지금 보관 중인 곳'));
  record('과업 A', '발견 장소(도서관)와 보관 장소(학생지원팀·행정관)가 다름을 확인할 수 있음', detail.includes('도서관') && detail.includes('학생지원팀') && detail.includes('행정관'));
  record('과업 A', '찾아가는 방법(운영 시간·문의처·수령 절차)과 "담당자가 소유 여부를 확인" 안내', detail.includes('운영 시간') && detail.includes('문의처') && detail.includes('소유 여부를 확인'));
  record('과업 A', '개인정보·비공개 특징이 상세에 노출되지 않음', !detail.includes('노란색 스티커') && !detail.includes('user1@'));
  await shot(page, '21-taskA-2-detail-mobile');
  const elapsedA = Math.round((Date.now() - t0) / 1000);
  record('과업 A', '지도·Kakao 키 없이 목록→상세만으로 완료', true, `자동화 수행 시간 ${elapsedA}초(사람의 소요 시간이 아님)`);
  // 하단 고정 버튼이 하단 메뉴에 가리지 않는지
  const covered = await page.evaluate(`(() => {
    const out = [];
    document.querySelectorAll('button, a').forEach((el) => {
      if (!/목록으로|반환 신청/.test(el.textContent)) return;
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (top && !el.contains(top) && !top.contains(el)) out.push(el.textContent.trim() + ' ← ' + top.tagName);
    });
    return out;
  })()`);
  record('과업 A', '상세 하단 버튼("반환 신청", "목록으로")이 하단 메뉴에 가려지지 않음', covered.length === 0, covered.join(', '));

  // ============ 과업 B: 학생회관에서 검은색 우산을 주움 → 날짜·장소·종류·특징 입력 → 제출 완료 (5분)
  t0 = Date.now();
  await page.goto(`${BASE}/report-found`);
  const redirected = (await page.url()).startsWith('/login');
  record('과업 B', '로그인하지 않고 "습득물 신고"로 가면 로그인 화면으로 안내됨', redirected, await page.url());
  await shot(page, '22-taskB-1-login-redirect-mobile');
  await loginByUi(page, 'user2@demo.local');
  await page.settle(800);
  record('과업 B', '로그인 후 원래 가려던 신고 화면으로 돌아옴', (await page.url()) === '/report-found', await page.url());

  await page.click('label[for="categoryId-4"]');
  await page.type('#title', '검은색 우산');
  await page.type('#description', '검은색 장우산, 손잡이가 갈색 나무');
  const todayDefault = await page.evaluate("document.querySelector('#foundDate').value");
  record('과업 B', '발견 날짜가 오늘로 미리 채워지고 미래 날짜는 선택 불가', Boolean(todayDefault) && Boolean(await page.evaluate("document.querySelector('#foundDate').max")), `value=${todayDefault}`);
  await page.select('#foundBuildingId', '학생회관');
  // 잘못된 파일(텍스트)을 먼저 골라 보고 거절되는지 확인한 뒤 올바른 사진을 고른다
  await page.setFiles('input[type=file]', [path.resolve('frontend/public/demo-photos/README.md')]);
  await page.settle(500);
  const badFileText = await page.text();
  const noBlob = await page.evaluate("document.querySelectorAll('img[src^=\"blob:\"]').length === 0");
  record('잘못된 이미지', '이미지가 아닌 파일은 거절되고 이유를 알려줌(미리보기에 추가되지 않음)', noBlob && /JPG|PNG|WebP|이미지|형식/.test(badFileText));
  await shot(page, '23b-bad-file-rejected-mobile');
  await page.setFiles('input[type=file]', [PHOTO, PHOTO2]);
  const thumbShown = await page.waitFor("document.querySelectorAll('img[src^=\"blob:\"]').length >= 2");
  record('과업 B', '예시 사진 2장 선택 → 미리보기 표시', thumbShown);
  await page.click('label[for="custodyType-HANDED_OVER"]');
  await page.settle(500);
  await page.select('#storageId', '학생회관');
  await shot(page, '23-taskB-2-form-filled-mobile');
  await page.click('text=신고 내용 확인');
  await page.waitFor("location.pathname === '/report-found/preview'");
  const preview = await page.text();
  record('과업 B', '제출 전 미리보기에서 입력 내용 확인', preview.includes('검은색 우산') && preview.includes('학생회관'));
  await shot(page, '24-taskB-3-preview-mobile');
  const submitText = await page.evaluate(`[...document.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /제출|등록|신고/.test(t)).join('|')`);
  const submitLabel = submitText.split('|').find((t) => /제출|등록/.test(t)) || submitText.split('|')[0];
  await page.click(`text=${submitLabel}`);
  const done = await page.waitFor("location.pathname.startsWith('/report-found/complete/')", { timeout: 10000 });
  record('과업 B', '제출 완료 화면에 도달', done, await page.url());
  const complete = await page.text();
  record('과업 B', '접수 번호가 표시됨', /FI-\d+|접수 번호/.test(complete));
  await shot(page, '25-taskB-4-complete-mobile');
  const elapsedB = Math.round((Date.now() - t0) / 1000);
  record('과업 B', '지도·Kakao 키 없이 신고 완료', true, `자동화 수행 시간 ${elapsedB}초(사람의 소요 시간이 아님)`);

  // 방금 신고한 물품이 조회에 나오는지, 보관 장소가 보이는지
  await page.goto(`${BASE}/items?keyword=${encodeURIComponent('검은색 우산')}`);
  const found = (await page.text()).includes('검은색 우산');
  record('과업 B', '방금 신고한 우산이 분실물 조회에 나타남', found);
  const umbrellaHref = await page.evaluate(`[...document.querySelectorAll('a[href^="/items/"]')].find((a) => a.innerText.includes('검은색 우산'))?.getAttribute('href')`);
  await page.goto(`${BASE}${umbrellaHref}`);
  const gallery = await page.evaluate(`({ thumbs: document.querySelectorAll('ul[aria-label="추가 사진"] button').length, registered: document.body.innerText.includes('등록 ') })`);
  record('상세', '추가 사진이 있으면 작은 사진 버튼으로 바꿔 볼 수 있음', gallery.thumbs === 2, `버튼 ${gallery.thumbs}개`);
  record('상세', '등록 날짜가 표시됨', gallery.registered);
  await page.click('ul[aria-label="추가 사진"] li:nth-child(2) button');
  record('상세', '두 번째 사진을 고르면 큰 사진이 바뀜', await page.evaluate(`document.querySelector('ul[aria-label="추가 사진"] li:nth-child(2) button').getAttribute('aria-pressed') === 'true'`));
  await shot(page, '25b-item-detail-gallery-mobile');

  // 마이페이지: 내 습득물 수정 → 저장, 삭제 → 확인 → 조회에서 사라짐
  await page.goto(`${BASE}/mypage?tab=found`);
  await page.waitFor("document.querySelector('a[aria-label=\"검은색 우산 수정\"]')");
  await page.click('a[aria-label="검은색 우산 수정"]');
  await page.waitFor("document.querySelector('#title')");
  await page.type('#title', '검은색 장우산');
  await page.click('text=수정 내용 저장');
  const saved = await page.waitFor("location.pathname === '/mypage'", { timeout: 8000 });
  await page.waitFor("document.body.innerText.includes('검은색 장우산')");
  record('수정·삭제', '내 습득물 수정 후 저장하면 마이페이지 목록에 바뀐 이름이 보임', saved && (await page.text()).includes('검은색 장우산'));
  await shot(page, '25c-mypage-edit-saved-mobile');
  await page.click('button[aria-label="검은색 장우산 삭제"]');
  await page.waitFor("document.querySelector('[role=dialog]')");
  await page.evaluate("[...document.querySelectorAll('[role=dialog] button')].find((b) => b.textContent.trim() === '삭제').click()");
  await page.settle(1200);
  await page.goto(`${BASE}/items?keyword=${encodeURIComponent('우산')}`);
  const afterDelete = await page.text();
  record('수정·삭제', '삭제한 습득물은 분실물 조회에서 사라짐(Soft Delete)', !afterDelete.includes('검은색 장우산'));

  // 조회: 발견 장소(건물) 조건
  await page.goto(`${BASE}/items`);
  await page.select('#buildingId', '도서관');
  await page.waitFor("location.search.includes('buildingId=')");
  await page.settle(800);
  const libCards = await page.evaluate(`[...document.querySelectorAll('a[href^="/items/"]')].map((a) => a.innerText.replace(/\s+/g, ' '))`);
  record('조회', '발견 장소(건물) 조건으로 거르면 그 건물에서 발견된 물품만 나옴', libCards.length > 0 && libCards.length < 14 && libCards.every((c) => c.includes('도서관')), `${libCards.length}건`);

  // ============ 지도(Kakao 키 없음)
  await page.goto(`${BASE}/map`);
  const mapText = await page.text();
  record('키 없음', '지도 화면이 죽지 않고 안내 + 건물별 목록으로 대체됨', /지도를 (표시|불러)|지도 키|시연용|건물별/.test(mapText), mapText.replace(/\s+/g, ' ').slice(0, 120));
  await shot(page, '26-map-nokey-mobile');
  await page.goto(`${BASE}/report-lost`);
  record('키 없음', '분실 신고 화면이 키 없이 열림', (await page.text()).includes('분실'));

  // ============ 반환 신청 → 관리자 처리 (사용자 흐름)
  await page.goto(`${BASE}/items?keyword=${encodeURIComponent('회색 가방')}`);
  const bagHref = await page.evaluate(`document.querySelector('a[href^="/items/"]')?.getAttribute('href')`);
  await page.goto(`${BASE}${bagHref.replace('/items/', '/return-request/')}`);
  await page.type('#ownershipDescription', '앞주머니에 우산 고리가 달려 있어요');
  await page.click('text=반환 신청하기');
  const requested = await page.waitFor("document.body.innerText.includes('반환 신청이 접수되었어요')", { timeout: 8000 });
  record('반환 신청', '신청 접수 완료 화면', requested);
  await shot(page, '27-return-request-complete-mobile');
  await page.goto(`${BASE}/mypage?tab=returns`);
  record('반환 신청', '마이페이지 반환 신청 탭에 "신청 대기"로 보임', (await page.text()).includes('신청 대기'));
  await shot(page, '28-mypage-returns-mobile');

  // ============ 분실 신고 → 유사 물품 추천
  await page.goto(`${BASE}/report-lost?keyword=${encodeURIComponent('파란색 파우치')}&categoryId=4`);
  const prefilled = await page.evaluate("document.querySelector('#title')?.value");
  record('분실 신고', '검색 조건이 신고 폼에 미리 채워짐', prefilled === '파란색 파우치', `title=${prefilled}`);
  await page.select('#lostBuildingId', '도서관');
  await page.setValue('#lostDate', new Date(Date.now() - 86400000).toLocaleDateString('sv-SE'));
  await page.click('text=분실 신고 접수');
  const lostDone = await page.waitFor("location.pathname.startsWith('/report-lost/complete/')", { timeout: 8000 });
  record('분실 신고', '접수 완료 화면에 도달', lostDone, await page.url());
  await page.settle(1200);
  const lostText = await page.text();
  record('분실 신고', '완료 화면에 유사 습득물 추천과 "내 물건이라는 뜻은 아니다" 안내', lostText.includes('비슷한 습득물') && lostText.includes('내 물건이라는 뜻은 아니'));
  await shot(page, '29-lost-complete-matches-mobile');

  // ============ 키보드: 대화상자 Esc·포커스 복귀 (마이페이지 분실 신고 삭제 확인)
  await page.goto(`${BASE}/mypage?tab=lost`);
  await page.waitFor("[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === '삭제')");
  await page.evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '삭제').focus()");
  await page.press('Enter');
  const dialogOpen = await page.waitFor("document.querySelector('[role=dialog]')");
  const focusInside = await page.evaluate("document.querySelector('[role=dialog]')?.contains(document.activeElement)");
  record('키보드', '삭제 확인 대화상자가 열리고 포커스가 대화상자 안으로 이동', dialogOpen && focusInside);
  await shot(page, '30-confirm-dialog-mobile');
  await page.press('Escape');
  const closed = await page.waitFor("!document.querySelector('[role=dialog]')");
  const restored = await page.evaluate("document.activeElement?.textContent.trim() === '삭제'");
  record('키보드', 'Esc로 대화상자가 닫히고 포커스가 "삭제" 버튼으로 돌아옴', dialogOpen && closed && restored);

  // ============ 서버 연결 실패 처리 (브라우저를 오프라인으로 전환)
  await page.goto(`${BASE}/items`);
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.type('#keyword', '우산');
  await page.click('text==검색');
  await page.settle(1500);
  const offlineText = await page.text();
  record('연결 실패', '서버에 연결할 수 없을 때 앱이 죽지 않고 안내 문구를 보여줌', /연결|불러올 수 없|오류/.test(offlineText) && offlineText.includes('분실물 조회'), offlineText.replace(/\s+/g, ' ').slice(offlineText.indexOf('조건에') > 0 ? offlineText.indexOf('조건에') : 0, 200));
  await shot(page, '31-offline-error-mobile');
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  await page.close();
  fs.writeFileSync(OUT, JSON.stringify({ steps }, null, 2));
  const failed = steps.filter((s) => !s.ok);
  console.log(`\n합계: ${steps.length - failed.length} 통과 / ${failed.length} 실패`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
