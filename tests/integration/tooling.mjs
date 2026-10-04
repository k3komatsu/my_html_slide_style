import assert from 'node:assert/strict';
import { readFile, writeFile, access, rm } from 'node:fs/promises';
import path from 'node:path';
import { fixture } from '../fixture.mjs';
import { build, exportSite } from '../../tools/build.mjs';
import { serve } from '../../tools/serve.mjs';
import { check } from '../../tools/check.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openBrowser } from '../../tools/browser.mjs';

const { root, config, html } = await fixture();
let server, events, browser;
try {
  assert(html.includes('<title>Fixture &lt;&amp;&gt;</title>'));
  assert(html.indexOf('custom.js') < html.indexOf('lib/js/popover.js'));
  assert(html.indexOf('lib/js/deck.js') < html.indexOf('lib/js/tex-svg.js'));
  const bundled = spawnSync(process.execPath, [fileURLToPath(new URL('../../scripts/bundle-single.mjs', import.meta.url)), path.join(root, 'index.html'), path.join(root, 'single.html')], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(bundled.status, 0, bundled.stderr);
  assert(bundled.stdout.includes('外部参照なし'));
  assert.deepEqual((await check(path.join(root, 'single.html'))).issues, []);
  await writeFile(path.join(root, 'slide.config.mjs'), 'export default {');
  await assert.rejects(build(root));
  assert.equal(await readFile(path.join(root, 'index.html'), 'utf8'), html);
  await writeFile(path.join(root, 'slide.config.mjs'), `export default ${JSON.stringify(config)};`);
  const output = await exportSite(root, await build(root));
  await access(path.join(output, 'custom.js'));
  assert.deepEqual((await check(path.join(output, 'index.html'))).issues, []);
  await writeFile(path.join(output, 'stale'), 'old');
  await exportSite(root, await build(root));
  await assert.rejects(access(path.join(output, 'stale')));
  const logs = [];
  server = await serve(root, { log: message => logs.push(message) });
  const page = await (await fetch(server.url)).text();
  assert(page.includes('EventSource'));
  assert(!(await readFile(path.join(root, 'index.html'), 'utf8')).includes('EventSource'));
  browser = await openBrowser({ offline: false, label: 'serve' });
  await browser.load(server.url);
  await browser.evaluate('window.beforeReload = true');
  events = await fetch(`${server.url}/__slide_events`);
  const reader = events.body.getReader();
  await reader.read();
  const next = reader.read();
  await writeFile(path.join(root, 'parts/02_more.html'), '<section class="slide watched"><p class="box" style="--y:100px">Watched</p></section>');
  const chunk = await Promise.race([next, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('watch timed out')), 5000); timer.unref(); })]);
  assert(new TextDecoder().decode(chunk.value).includes('reload'));
  assert((await readFile(path.join(root, 'index.html'), 'utf8')).includes('Watched'));
  let reloaded = false;
  for (let i = 0; i < 50; i++) {
    if (await browser.evaluate(`!!document.querySelector('.watched') && !window.beforeReload`)) { reloaded = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(reloaded, 'Browser did not reload after editing source');
  await reader.cancel();
  await writeFile(path.join(root, 'slide.config.mjs'), 'export default {');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert(logs.some(message => message.startsWith('Build error:')));
  assert((await (await fetch(server.url)).text()).includes('Watched'));
  assert.equal((await fetch(`${server.url}/.git/config`)).status, 403);
  assert.deepEqual(browser.errors, []);
  const configText = `export default ${JSON.stringify(config)};`;
  await writeFile(path.join(root, 'slide.config.mjs'), configText);
  // Concurrent CLI and watch builds must not share temporary filenames.
  await Promise.all([build(root), build(root)]);
  console.log('PASS build, site, watch/reload, error recovery');
} finally {
  browser?.close();
  await server?.close();
  await rm(root, { recursive: true, force: true });
}
