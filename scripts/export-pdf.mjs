import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import path from 'node:path';

const [source, output] = process.argv.slice(2);
assert(source && output, 'Usage: node scripts/export-pdf.mjs index.html output.pdf');
await access(source);
const cache = path.join(homedir(), '.cache', 'b3exp_wireless_slide');
await mkdir(cache, { recursive: true });
const profile = await mkdtemp(path.join(cache, 'pdf-chrome-'));
const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let startupError;
chrome.on('error', error => { startupError = error; });
let socket;
const timeout = setTimeout(() => { console.error('PDF作成が120秒以内に完了しませんでした'); chrome.kill(); process.exit(1); }, 120000);
try {
  let port;
  for (let i = 0; i < 100; i++) {
    if (startupError) throw startupError;
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert(port, 'Chrome did not start');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.id) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
    }
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 2, mobile: false });
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.pdfFrames = new Map(); let frameID = 0;
    window.requestAnimationFrame = fn => { pdfFrames.set(++frameID, fn); return frameID; };
    window.cancelAnimationFrame = id => pdfFrames.delete(id);
    let seed = 20261002;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  ` });
  await cdp('Page.navigate', { url: pathToFileURL(path.resolve(source)).href });
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`document.readyState === 'complete' && !!window.MathJax?.startup?.promise`)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate(`(async () => {
    await MathJax.startup.promise;
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode()));
    document.querySelectorAll('.slide').forEach(slide => slide.classList.add('is-current'));
    const start = performance.now();
    // ponytail: requestAnimationFrame型デモを約3秒進める。CSSアニメーション・動画を追加したら別途静止状態を指定する。
    for (let i = 1; i <= 180; i++) {
      const frames = [...pdfFrames.values()]; pdfFrames.clear();
      for (const frame of frames) frame(start + i * 1000 / 60);
    }
    // 描画済みの図と設定値は残し、PDFでは操作ボタンを非表示にする。
    const style = document.createElement('style');
    style.textContent = '@media print { .interactive button { display:none !important; } * { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .slide:last-child { page-break-after:auto; } }';
    document.head.append(style);
    return true;
  })()`);
  const report = await evaluate(`({
    slides: document.querySelectorAll('.slide').length,
    math: document.querySelectorAll('mjx-container').length,
    mathErrors: document.querySelectorAll('mjx-merror, [data-mjx-error]').length,
    brokenImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.src),
    plots: [...document.querySelectorAll('canvas')].map(canvas => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0, colored = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3]) opaque++;
        if (data[i + 3] && Math.max(data[i], data[i+1], data[i+2]) - Math.min(data[i], data[i+1], data[i+2]) > 40) colored++;
      }
      return { page: [...document.querySelectorAll('.slide')].indexOf(canvas.closest('.slide')) + 1, class: canvas.className, opaque, colored };
    })
  })`);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert(report.slides > 0, 'No slides found');
  assert.equal(report.mathErrors, 0, 'Math rendering errors');
  assert.equal(report.brokenImages.length, 0, 'Missing images');
  assert(report.plots.every(plot => plot.opaque > 0 && plot.colored > 0), 'An animation plot is blank');
  const pdf = await cdp('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
  await writeFile(output, Buffer.from(pdf.data, 'base64'), { flag: 'wx' });
  await writeFile(path.join(profile, 'validation.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, validation: path.join(profile, 'validation.json'), ...report }, null, 2));
} finally {
  clearTimeout(timeout);
  socket?.close(); chrome.kill();
}
