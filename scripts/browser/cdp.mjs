// Chrome DevTools Protocol 최소 클라이언트 (외부 라이브러리 없이 Node 22+ 내장 WebSocket 사용).
// 12단계 실제 브라우저 점검용: 헤드리스 Chrome을 띄워 화면을 열고, 클릭·입력·스크린샷·검사 스크립트를 실행한다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchBrowser({ port = 9333 } = {}) {
  const exe = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('Chrome/Edge를 찾지 못했습니다. CHROME_PATH 환경변수에 실행 파일 경로를 지정해 주세요.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'thatsmine-chrome-'));
  const proc = spawn(
    exe,
    ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
      '--hide-scrollbars', '--disable-gpu', 'about:blank'],
    { stdio: 'ignore' },
  );
  let version;
  for (let i = 0; i < 50; i += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      break;
    } catch {
      await sleep(200);
    }
  }
  if (!version) throw new Error('브라우저 원격 디버깅 포트에 연결하지 못했습니다.');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  return new Page(ws, proc, profile, version.Browser);
}

export class Page {
  constructor(ws, proc, profile, browserName) {
    this.ws = ws;
    this.proc = proc;
    this.profile = profile;
    this.browserName = browserName;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    this.consoleErrors = [];
    this.failedRequests = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method) {
        this.onEvent(msg);
        this.listeners.forEach((l) => l(msg));
      }
    };
  }

  onEvent(msg) {
    if (msg.method === 'Runtime.exceptionThrown') {
      this.consoleErrors.push(`exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      this.consoleErrors.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300)}`);
    } else if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 500) {
      this.failedRequests.push(`${msg.params.response.status} ${msg.params.response.url}`);
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async init() {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
    await this.send('DOM.enable');
  }

  /** width×height 화면. mobile이면 터치·2배 해상도 */
  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  }

  async addInitScript(source) {
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source });
  }

  async goto(url, { settle = 700 } = {}) {
    const loaded = new Promise((resolve) => {
      const l = (msg) => {
        if (msg.method === 'Page.loadEventFired') {
          this.listeners = this.listeners.filter((x) => x !== l);
          resolve();
        }
      };
      this.listeners.push(l);
    });
    await this.send('Page.navigate', { url });
    await Promise.race([loaded, sleep(15000)]);
    await this.settle(settle);
  }

  /** 화면이 그려지고 요청이 끝날 때까지 잠시 기다린다 */
  async settle(ms = 700) {
    await sleep(ms);
  }

  async waitFor(expression, { timeout = 8000, interval = 150 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.evaluate(`Boolean(${expression})`)) return true;
      await sleep(interval);
    }
    return false;
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  }

  async screenshot(file, { fullPage = false } = {}) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const params = { format: 'png' };
    if (fullPage) {
      const metrics = await this.send('Page.getLayoutMetrics');
      const { width, height } = metrics.cssContentSize || metrics.contentSize;
      params.clip = { x: 0, y: 0, width, height: Math.min(height, 6000), scale: 1 };
      params.captureBeyondViewport = true;
    }
    const { data } = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
  }

  /** CSS 선택자(또는 텍스트)로 요소의 중심 좌표를 찾아 실제 마우스 클릭을 보낸다 */
  async click(target) {
    const point = await this.evaluate(`(() => {
      const t = ${JSON.stringify(target)};
      let el = null;
      if (t.startsWith('text==') || t.startsWith('text=')) {
        const exact = t.startsWith('text==');
        const text = t.slice(exact ? 6 : 5);
        el = [...document.querySelectorAll('a,button,label,[role=tab],summary')].find((e) => (exact ? e.textContent.trim() === text : e.textContent.trim().includes(text)) && e.getBoundingClientRect().width > 0);
      } else {
        el = document.querySelector(t);
      }
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!point) throw new Error(`클릭할 요소를 찾지 못했습니다: ${target}`);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await this.settle(400);
  }

  /** 입력창에 포커스를 주고 값을 지운 뒤 글자를 입력한다(실제 키 입력 이벤트에 가깝게 insertText 사용) */
  async type(selector, text) {
    await this.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.scrollIntoView({block:'center'}); el.focus(); el.select && el.select(); })()`);
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    if (text) await this.send('Input.insertText', { text });
    await this.settle(150);
  }

  async press(key, { shift = false } = {}) {
    const codes = { Tab: 9, Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35 };
    const vk = codes[key];
    const modifiers = shift ? 8 : 0;
    // Enter는 글자 입력(캐리지 리턴)으로 보내야 버튼이 눌린다
    const type = key === 'Enter' ? 'keyDown' : 'rawKeyDown';
    const text = key === 'Enter' ? '\r' : undefined;
    await this.send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: vk, modifiers, text });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: vk, modifiers });
    await this.settle(120);
  }

  /** <select>에서 보이는 글자(또는 값)로 옵션을 고른다. React가 변경을 알도록 change 이벤트를 보낸다 */
  async select(selector, labelOrValue) {
    const ok = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const opt = [...el.options].find((o) => o.textContent.trim().includes(${JSON.stringify(labelOrValue)}) || o.value === ${JSON.stringify(labelOrValue)});
      if (!opt) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(el, opt.value);
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`옵션을 고르지 못했습니다: ${selector} / ${labelOrValue}`);
    await this.settle(200);
  }

  /** 날짜·시간 입력처럼 키보드로 치기 어려운 입력에 값을 넣고 React에 알린다 */
  async setValue(selector, value) {
    const ok = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`입력을 찾지 못했습니다: ${selector}`);
    await this.settle(150);
  }

  async url() {
    return this.evaluate('location.pathname + location.search');
  }

  async text() {
    return this.evaluate('document.body.innerText');
  }

  async setFiles(selector, files) {
    const { root } = await this.send('DOM.getDocument');
    const { nodeId } = await this.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    if (!nodeId) throw new Error(`파일 입력을 찾지 못했습니다: ${selector}`);
    await this.send('DOM.setFileInputFiles', { nodeId, files });
    await this.settle(500);
  }

  async close() {
    try {
      this.ws.close();
    } catch {
      /* 무시 */
    }
    this.proc.kill();
    await sleep(300);
    try {
      fs.rmSync(this.profile, { recursive: true, force: true });
    } catch {
      /* 프로필 폴더가 아직 잠겨 있으면 그대로 둔다 */
    }
  }
}
