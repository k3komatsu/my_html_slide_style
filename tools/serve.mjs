import { createServer } from 'node:http';
import { watch } from 'node:fs';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { build } from './build.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const reload = `<script>(() => { const events = new EventSource('/__slide_events'); events.onmessage = () => location.reload(); })();</script>`;

export async function serve(root, { port = 0, log = console.log } = {}) {
  root = await realpath(root);
  await build(root);
  const clients = new Set();
  let timer, building = false, dirty = false, stopped = false, running;
  async function rebuild() {
    dirty = true;
    if (building || stopped) return;
    building = true;
    do {
      dirty = false;
      try {
        await build(root);
        log('Rebuilt index.html');
        for (const client of clients) client.write('data: reload\n\n');
      } catch (error) { log(`Build error: ${error.message}`); }
    } while (dirty && !stopped);
    building = false;
  }
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/__slide_events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(': connected\n\n'); clients.add(res);
        req.on('close', () => clients.delete(res)); return;
      }
      if (pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(403); res.end(); return; }
      const file = await realpath(path.join(root, pathname === '/' ? 'index.html' : pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      let data = await readFile(file);
      if (path.extname(file) === '.html') data = Buffer.from(data.toString().replace('</body>', `${reload}</body>`));
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 400); res.end('File unavailable'); }
  });
  let watcher;
  const close = async () => {
    stopped = true; clearTimeout(timer); watcher?.close();
    await running;
    for (const client of clients) client.end();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  };
  try {
    watcher = watch(root, { recursive: true }, (_, filename) => {
      const file = String(filename ?? '').replaceAll('\\', '/');
      if (file === 'lib/js/deck.js' || file.endsWith('.tmp') || file.endsWith('.DS_Store')) return;
      if (file !== 'slide.config.mjs' && !/^(parts|slides|css|styles|js|scripts|figures|assets|lib|core)\//.test(file)) return;
      clearTimeout(timer); timer = setTimeout(() => {
        if (building) { dirty = true; return; }
        running = rebuild();
      }, 80);
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  } catch (error) { await close(); throw error; }
  const url = `http://127.0.0.1:${server.address().port}`;
  log(`Serving ${url} (Ctrl+C to stop)`);
  return { url, close };
}
