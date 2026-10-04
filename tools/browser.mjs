import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function openBrowser({ offline = true, label = 'check' } = {}) {
  const cache = path.join(homedir(), '.cache', 'html-slide');
  await mkdir(cache, { recursive: true });
  const profile = await mkdtemp(path.join(cache, `${label}-`));
  const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  let startupError, socket;
  chrome.on('error', error => { startupError = error; });
  const pending = new Map(), errors = [], failed = [], external = [], requests = new Map();
  let id = 0;
  const close = () => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('Browser closed')); }
    pending.clear(); socket?.close(); chrome.kill();
  };
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      if (startupError) throw startupError;
      try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert(port, 'Chrome did not start; set CHROME_PATH to the Chrome executable');
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(5000) })).json();
    socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome connection timed out')), 5000);
      socket.onopen = () => { clearTimeout(timer); resolve(); };
      socket.onerror = error => { clearTimeout(timer); reject(error); };
    });
    socket.onmessage = event => {
      const m = JSON.parse(event.data);
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
      if (m.method === 'Network.requestWillBeSent') {
        requests.set(m.params.requestId, m.params.request.url);
        if (/^https?:/.test(m.params.request.url)) external.push(m.params.request.url);
      }
      if (m.method === 'Network.loadingFailed') failed.push({ ...m.params, url: requests.get(m.params.requestId) });
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
        m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
      }
    };
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const requestID = ++id;
      const timer = setTimeout(() => { pending.delete(requestID); reject(new Error(`${method} timed out`)); }, 15000);
      pending.set(requestID, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestID, method, params }));
    });
    const evaluate = async expression => {
      const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    if (offline) await cdp('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
    await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
    const load = async target => {
      const navigation = await cdp('Page.navigate', { url: /^https?:/.test(target) ? target : pathToFileURL(path.resolve(target)).href });
      assert(!navigation.errorText, navigation.errorText);
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`document.readyState === 'complete'`)) { ready = true; break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert(ready, 'Page did not finish loading');
      await evaluate(`(async () => {
        if (window.MathJax?.startup?.promise) await MathJax.startup.promise;
        await document.fonts.ready;
        await Promise.allSettled([...document.images].map(img => img.decode()));
      })()`);
    };
    return { cdp, evaluate, load, close, profile, errors, failed, external };
  } catch (error) { close(); throw error; }
}
