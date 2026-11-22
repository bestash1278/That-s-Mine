// 실제 브라우저(헤드리스 Chrome) 화면 점검. 사용: node scripts/browser/audit.mjs [결과 JSON 경로] [스크린샷 폴더]
// 필요: dev 프로필 백엔드(8080) + 프론트 개발 서버(5173). 시연 데이터가 있는 상태.
// 점검 항목: 가로 넘침, 터치 영역(44px), 입력 글자 크기(16px), 라벨 없는 입력, 이름 없는 버튼·링크, alt 없는 이미지,
//           글자 대비(WCAG AA 4.5:1), 키보드 Tab 이동 시 포커스 표시, 콘솔 오류, 5xx 응답, 문서 제목.
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from './cdp.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = process.argv[2] || 'audit-results.json';
const SHOTS = process.argv[3] || '';
const TOKEN_KEY = 'thatsmine.accessToken';

const VIEWPORTS = [
  { key: 'mobile', width: 375, height: 812, mobile: true },
  { key: 'tablet', width: 768, height: 1024, mobile: false },
  { key: 'pc', width: 1280, height: 800, mobile: false },
];

async function api(pathname, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}/api/v1${pathname}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}
const login = async (email) => (await api('/auth/login', { method: 'POST', body: { email, password: 'demo1234!' } })).data.accessToken;

// ---- 화면 안에서 실행되는 검사 (문자열로 주입)
const AUDIT_SOURCE = `(() => {
  const issues = { overflow: [], smallTargets: [], smallInputText: [], unlabeled: [], noName: [], noAlt: [], contrast: [] };
  const vw = window.innerWidth;
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) issues.overflow.push('문서 너비 ' + sw + ' > 화면 ' + vw);
  const visible = (el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0 && r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]') && !el.closest('.sr-only');
  };
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '[' + (el.getAttribute('aria-label') || el.getAttribute('name') || (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24)) + ']';
  const seen = new Set();
  const add = (list, text) => { if (!seen.has(list + text) && issues[list].length < 30) { seen.add(list + text); issues[list].push(text); } };
  // 가로로 화면 밖으로 나간 요소
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 && getComputedStyle(el).position !== 'fixed' && !el.closest('[class*="overflow-x"]')) add('overflow', desc(el) + ' 오른쪽 ' + Math.round(r.right));
  });
  // 터치 영역·이름·라벨
  document.querySelectorAll('a,button,input:not([type=hidden]),select,textarea,[role=tab],[role=button],summary').forEach((el) => {
    if (!visible(el) || el.disabled) return;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const isCheck = el.matches('input[type=checkbox],input[type=radio]');
    const inline = el.tagName === 'A' && cs.display === 'inline' && el.parentElement && el.parentElement.textContent.trim().length > el.textContent.trim().length + 2;
    const target = isCheck ? (el.closest('label') || el) : el;
    const tr = target.getBoundingClientRect();
    if (!inline && Math.min(tr.width, tr.height) < 43.5) add('smallTargets', desc(el) + ' ' + Math.round(tr.width) + 'x' + Math.round(tr.height));
    if (el.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea') && parseFloat(cs.fontSize) < 16) add('smallInputText', desc(el) + ' ' + cs.fontSize);
    if (el.matches('input,select,textarea') && !el.matches('[type=file],[type=submit],[type=button]')) {
      const named = (el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label');
      if (!named) add('unlabeled', desc(el));
    } else if (el.matches('a,button,[role=tab],[role=button],summary')) {
      const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim() || (el.querySelector('img[alt]') && el.querySelector('img[alt]').alt.trim());
      if (!name) add('noName', desc(el));
    }
  });
  document.querySelectorAll('img').forEach((img) => { if (visible(img) && !img.hasAttribute('alt')) add('noAlt', img.src.slice(-40)); });
  // 글자 대비
  const parse = (c) => {
    let m = c.match(/rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    m = c.match(/color\\(srgb ([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ \\/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
    return null;
  };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => {
    const layers = []; let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      node = node.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const check = (el, text, color, size, weight, bg, label) => {
    const fg = parse(color); if (!fg || !bg) return;
    const ratioValue = ratio(over(fg, bg), bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    if (ratioValue < (large ? 3 : 4.5)) add('contrast', desc(el) + ' ' + label + ' ' + ratioValue.toFixed(2) + ':1 (' + color + ' on rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + '))');
  };
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el) || el.disabled) return;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const cs = getComputedStyle(el);
    check(el, '', cs.color, parseFloat(cs.fontSize), parseInt(cs.fontWeight, 10), bgOf(el), '글자');
  });
  document.querySelectorAll('input,textarea').forEach((el) => {
    if (!visible(el) || !el.placeholder) return;
    const ph = getComputedStyle(el, '::placeholder');
    check(el, '', ph.color, parseFloat(ph.fontSize), 400, bgOf(el), '안내 글자');
  });
  return { title: document.title, lang: document.documentElement.lang, h1: [...document.querySelectorAll('h1')].map((e) => e.textContent.trim()), issues };
})()`;

const FOCUS_SOURCE = `(() => {
  const el = document.activeElement; if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
  const shadow = cs.boxShadow && cs.boxShadow !== 'none';
  const name = (el.getAttribute('aria-label') || el.textContent || el.name || el.id || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
  const r = el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), name, visibleIndicator: outline || Boolean(shadow), inView: r.bottom > 0 && r.top < innerHeight };
})()`;

async function main() {
  const [userToken, adminToken] = [await login('user2@demo.local'), await login('admin@demo.local')];
  const items = (await api('/found-items?size=20')).data.content;
  const itemId = items.find((i) => i.title === '파란색 파우치' && i.status === 'STORED').itemId;
  const tempItemId = items.find((i) => i.title === '파란색 텀블러')?.itemId || items[0].itemId;
  const myLost = (await api('/users/me/lost-reports?size=20', { token: userToken })).data.content;
  const lostId = myLost.find((r) => r.status === 'SEARCHING').reportId;

  const pages = [
    { name: 'home', path: '/', shot: '01-home' },
    { name: 'items', path: '/items', shot: '02-items' },
    { name: 'items-search', path: '/items?keyword=' + encodeURIComponent('파우치'), shot: '03-items-search' },
    { name: 'items-empty', path: '/items?keyword=' + encodeURIComponent('존재하지않는물건'), shot: '04-items-empty' },
    { name: 'item-detail', path: `/items/${itemId}`, shot: '05-item-detail' },
    { name: 'item-detail-2', path: `/items/${tempItemId}` },
    { name: 'map', path: '/map', shot: '06-map-nokey' },
    { name: 'login', path: '/login', shot: '07-login' },
    { name: 'signup', path: '/signup' },
    { name: 'report-found', path: '/report-found', auth: 'user', shot: '08-report-found' },
    { name: 'report-lost', path: '/report-lost', auth: 'user', shot: '09-report-lost' },
    { name: 'lost-detail', path: `/lost-reports/${lostId}`, auth: 'user', shot: '10-lost-detail-matches' },
    { name: 'mypage', path: '/mypage', auth: 'user' },
    { name: 'mypage-found', path: '/mypage?tab=found', auth: 'user' },
    { name: 'mypage-lost', path: '/mypage?tab=lost', auth: 'user', shot: '11-mypage-lost' },
    { name: 'mypage-returns', path: '/mypage?tab=returns', auth: 'user' },
    { name: 'return-request', path: `/return-request/${itemId}`, auth: 'user', shot: '12-return-request' },
    { name: 'admin-returns', path: '/admin', auth: 'admin', shot: '13-admin-returns' },
    { name: 'admin-found', path: '/admin?tab=found', auth: 'admin', shot: '14-admin-found' },
    { name: 'admin-lost', path: '/admin?tab=lost', auth: 'admin' },
    { name: 'admin-places', path: '/admin?tab=places', auth: 'admin' },
    { name: 'not-found', path: '/nothing-here' },
  ];

  const results = [];
  const browser = await launchBrowser();
  await browser.init();
  for (const vp of VIEWPORTS) {
    await browser.setViewport(vp.width, vp.height, vp.mobile);
    for (const pg of pages) {
      const token = pg.auth === 'admin' ? adminToken : pg.auth === 'user' ? userToken : null;
      await browser.goto(`${BASE}/`, { settle: 100 });
      await browser.evaluate(`localStorage.${token ? `setItem('${TOKEN_KEY}', '${token}')` : `removeItem('${TOKEN_KEY}')`}`);
      browser.consoleErrors.length = 0;
      browser.failedRequests.length = 0;
      await browser.goto(`${BASE}${pg.path}`, { settle: 1200 });
      const audit = await browser.evaluate(AUDIT_SOURCE);
      // 키보드: 처음부터 Tab을 눌러 포커스 표시 확인(모바일에서는 생략하지 않고 같은 방식으로)
      await browser.evaluate('document.activeElement && document.activeElement.blur(); window.scrollTo(0,0)');
      const focus = [];
      for (let i = 0; i < 25; i += 1) {
        await browser.press('Tab');
        const f = await browser.evaluate(FOCUS_SOURCE);
        if (f) focus.push(f);
      }
      const noRing = focus.filter((f) => !f.visibleIndicator).map((f) => `${f.tag}[${f.name}]`);
      if (SHOTS && pg.shot && (vp.key === 'mobile' || vp.key === 'pc')) {
        await browser.evaluate('window.scrollTo(0,0)');
        await browser.screenshot(path.join(SHOTS, `${pg.shot}-${vp.key}.png`));
      }
      results.push({
        viewport: vp.key, page: pg.name, path: pg.path, title: audit.title, h1: audit.h1,
        issues: audit.issues, focusCount: focus.length, focusWithoutIndicator: [...new Set(noRing)],
        consoleErrors: [...browser.consoleErrors], serverErrors: [...browser.failedRequests],
      });
      process.stdout.write('.');
    }
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ browser: browser.browserName, base: BASE, results }, null, 2));
  console.log(`\n저장: ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
