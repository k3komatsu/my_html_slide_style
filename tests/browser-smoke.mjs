// Node.js 22.4以降 + Chrome。外部パッケージ不要。
// 対象は引数で指定できる（既定: index.html）。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, process.argv[2] ?? 'index.html');
const cache = path.join(homedir(), '.cache', 'b3exp_wireless_slide');
await mkdir(cache, { recursive: true });
const profile = await mkdtemp(path.join(cache, 'template-smoke-'));
const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket, startupError;
chrome.on('error', error => { startupError = error; });
const timeout = setTimeout(() => { console.error('Template test timed out'); chrome.kill(); process.exit(1); }, 60000);
try {
  let port;
  for (let i = 0; i < 100; i++) {
    if (startupError) throw startupError;
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert(port, 'Chrome did not start');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), errors = [], failed = [], external = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Network.loadingFailed') failed.push(message.params);
    if (message.method === 'Network.requestWillBeSent' && /^https?:/.test(message.params.request.url)) external.push(message.params.request.url);
    if (message.id) {
      const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await cdp('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
  await cdp('Page.navigate', { url: pathToFileURL(target).href });
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`document.readyState === 'complete' && !!window.MathJax?.startup?.promise`)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate(`(async () => { await MathJax.startup.promise; await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); })()`);
  assert.equal(await evaluate(`document.querySelectorAll('.slide').length`), 9);
  assert.equal(await evaluate(`document.querySelectorAll('.slide-page mjx-container [data-mml-node="mfrac"]').length`), 7);
  assert.equal(await evaluate(`document.querySelectorAll('mjx-merror, [data-mjx-error]').length`), 0);
  assert.equal(await evaluate(`document.querySelectorAll('.slide--cover .slide-page, .slide--section .slide-page').length`), 0);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.slide:not(.slide--cover):not(.slide--section)'), '::before').content`), '"発表者名　　HTMLスライド テンプレート"');
  for (const [width, height] of [[320, 480], [480, 320], [960, 540], [1440, 900]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await evaluate(`(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (let i = 0; i < SlideDeck.slides.length; i++) {
        SlideDeck.show(i);
        const slide = document.querySelector('.slide.is-current'), b = slide.getBoundingClientRect();
        const keys = document.querySelector('.key-bindings').getBoundingClientRect();
        if (b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > keys.top + 1) throw Error('Slide or keys overflow');
        for (const el of slide.querySelectorAll('h1, .box, .fig, .callout, .note-box, .sample-demo')) {
          if (el.offsetLeft < 0 || el.offsetTop < 0 || el.offsetLeft + el.offsetWidth > 960 || el.offsetTop + el.offsetHeight > 518) throw Error('Content overflow: ' + el.outerHTML.slice(0, 150));
        }
      }
      SlideDeck.show(7);
      document.querySelector('.demo-scale-setting').click();
      const pop = document.querySelector('.sim-pop'), p = pop.getBoundingClientRect(), s = document.querySelector('.slide.is-current').getBoundingClientRect();
      if (!pop || p.left < s.left || p.top < s.top || p.right > s.right || p.bottom > s.bottom) throw Error('Popup overflow');
      simPopover.close(); document.querySelector('.slide.is-current').focus();
    })()`);
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(profile, `screen-${width}x${height}.png`), Buffer.from(screenshot.data, 'base64'));
  }
  await evaluate(`(async () => {
    SlideDeck.show(7);
    const host = document.querySelector('.demo-scale-setting');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const input = document.querySelector('.sim-pop input');
    input.value = '5'; input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 0));
    if (document.querySelector('.demo-value').textContent !== '5' || document.querySelector('.sim-pop output').textContent !== '5' || document.querySelector('.demo-bar').getAttribute('width') !== '750') throw Error('Input is not synchronized');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    if (SlideDeck.current !== 7 || document.querySelector('.focus-notice').hidden) throw Error('Input advanced slide or notice missing');
    document.querySelector('.focus-notice button').click();
    if (document.querySelector('.sim-pop') || SlideDeck.current !== 7 || document.activeElement !== SlideDeck.slides[7]) throw Error('Resume did not restore slide focus');
    const selectHost = document.querySelector('.demo-color-setting'); selectHost.click();
    const select = document.querySelector('.sim-pop select'); select.value = '#da3c3e'; select.dispatchEvent(new Event('input'));
    if (selectHost.querySelector('b').textContent !== '赤' || document.querySelector('.demo-bar').getAttribute('fill') !== '#da3c3e') throw Error('Select is not synchronized');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (document.querySelector('.sim-pop')) throw Error('Escape did not close popup');
    document.querySelector('.demo-reset').click();
    if (document.querySelector('.demo-value').textContent !== '3' || selectHost.querySelector('b').textContent !== '青') throw Error('Reset failed');
    host.click(); SlideDeck.show(8); await new Promise(resolve => setTimeout(resolve, 0));
    if (document.querySelector('.sim-pop')) throw Error('Popup survived navigation');
    SlideDeck.show(0); SlideDeck.slides[0].focus();
    dispatchEvent(new KeyboardEvent('keydown', { key: 'M', bubbles: true, cancelable: true }));
    if (!SlideDeck.slides[0].classList.contains('is-menu') || !SlideDeck.slides[0].querySelector('.logo-btn').hidden) throw Error('Cover menu failed');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    SlideDeck.show(2); SlideDeck.slides[2].focus();
    dispatchEvent(new KeyboardEvent('keydown', { key: 'O', bubbles: true }));
    if (!document.documentElement.classList.contains('overview') || !document.querySelector('.key-bindings').hidden) throw Error('Overview failed');
    SlideDeck.slides[4].click();
    if (SlideDeck.current !== 4 || document.documentElement.classList.contains('overview')) throw Error('Overview selection failed');
    SlideDeck.slides[4].dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: SlideDeck.slides[4].getBoundingClientRect().left + 1 }));
    if (SlideDeck.current !== 3) throw Error('Left edge did not go back');
    const link = document.createElement('a'); link.href = '#'; link.textContent = 'link'; link.addEventListener('click', e => e.preventDefault()); SlideDeck.slides[3].append(link); link.click(); link.remove();
    if (SlideDeck.current !== 3) throw Error('Link advanced slide');
  })()`);
  const fs = await cdp('Runtime.evaluate', { expression: 'document.documentElement.requestFullscreen()', userGesture: true, awaitPromise: true });
  assert(!fs.exceptionDetails, JSON.stringify(fs.exceptionDetails));
  await evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`document.querySelector('.key-bindings').hidden`), true);
  await evaluate(`document.exitFullscreen()`);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; i < 9; i++) {
    await evaluate(`SlideDeck.show(${i}); document.querySelector('.slide.is-current').focus()`);
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(profile, `slide-${i + 1}.png`), Buffer.from(screenshot.data, 'base64'));
  }
  await cdp('Emulation.setEmulatedMedia', { media: 'print' });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.key-bindings')).display`), 'none');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.focus-notice')).display`), 'none');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.slide')).display`), 'block');
  await evaluate(`SlideDeck.toggleOverview()`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.slides')).display`), 'block');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.slide')).zoom`), '1');
  assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(external, []);
  console.log(JSON.stringify({ result: 'PASS', slides: 9, numbered: 7, screenshots: profile }, null, 2));
} finally {
  clearTimeout(timeout); socket?.close(); chrome.kill();
}
