import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, access, mkdir, cp, rm, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Script } from 'node:vm';
import { randomUUID } from 'node:crypto';

const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const cssString = value => '"' + [...value].map(c => /["\\<>\n\r\f]/.test(c) ? `\\${c.codePointAt(0).toString(16)} ` : c).join('') + '"';
export const remote = value => /^(?:https?:)?\/\//.test(value);
const runtimeSources = ['state', 'pagination', 'focus', 'navigation', 'display', 'overview', 'deck'];
async function writeAtomic(file, content) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, content); await rename(temporary, file); }
  finally { await rm(temporary, { force: true }); }
}

export async function loadConfig(root) {
  const url = pathToFileURL(path.join(root, 'slide.config.mjs'));
  // Reload the config entry on each build. Imported helper modules retain Node's normal cache.
  url.searchParams.set('build', `${Date.now()}-${Math.random()}`);
  const config = (await import(url.href)).default;
  assert(config && typeof config === 'object' && !Array.isArray(config), 'config must export a default object');
  for (const key of ['title', 'lang', 'author', 'affiliation', 'footer']) assert(typeof config[key] === 'string', `config.${key} must be a string`);
  assert(['local', 'cdn'].includes(config.mathjax?.mode), 'mathjax.mode must be local or cdn');
  assert(config.features === undefined || (config.features && typeof config.features === 'object' && !Array.isArray(config.features)), 'config.features must be an object');
  for (const key of ['styles', 'scripts']) {
    assert(Array.isArray(config[key]) && config[key].every(p => typeof p === 'string'), `config.${key} must be an array of paths`);
    for (const p of config[key]) {
      if (remote(p)) continue;
      assert(p && !path.isAbsolute(p) && !p.split(/[\\/]/).includes('..') && !/[?#:]/.test(p), `invalid ${key} path: ${p}`);
      await access(path.join(root, p));
    }
  }
  const features = { overview: true, menu: true, laser: true, popover: true, ...config.features };
  for (const [key, value] of Object.entries(features)) {
    assert(['overview', 'menu', 'laser', 'popover'].includes(key) && typeof value === 'boolean', `invalid feature: ${key}`);
  }
  return { ...config, features };
}

export async function build(root, { cdn = false } = {}) {
  const config = await loadConfig(root);
  if (cdn) config.mathjax.mode = 'cdn';
  const render = text => text.replace(/\{\{(title|lang|author|affiliation)\}\}/g, (_, key) => escapeHTML(config[key]));
  let head = render(await readFile(path.join(root, 'parts/00_head.html'), 'utf8'));
  const settings = `<style>:root { --footer-text: ${cssString(config.footer)}; }</style>\n<script>window.SlideConfig = ${json({ features: config.features })};</script>`;
  assert(head.includes('<!-- slide:styles -->') && head.includes('<!-- slide:settings -->'), 'head template is missing slide markers');
  head = head.replace('<!-- slide:styles -->', config.styles.map(p => `<link rel="stylesheet" href="${escapeHTML(p)}">`).join('\n'))
    .replace('<!-- slide:settings -->', settings);
  const names = (await readdir(path.join(root, 'parts'))).filter(p => p.endsWith('.html') && p !== '00_head.html').sort();
  assert(names.length, 'No slide source files found');
  const body = (await Promise.all(names.map(p => readFile(path.join(root, 'parts', p), 'utf8')))).map(render).join('');
  const runtime = (await Promise.all(runtimeSources.map(p => readFile(path.join(root, 'lib/runtime', p + '.js'), 'utf8')))).join('\n');
  const bundle = `/* Generated from lib/runtime/*.js by tools/slide.mjs build. */\n(() => {\n${runtime}})();\n`;
  new Script(bundle, { filename: 'lib/js/deck.js' });
  const scripts = ['lib/js/deck.js', ...config.scripts, ...(config.features.popover ? ['lib/js/popover.js'] : []),
    config.mathjax.mode === 'cdn' ? 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js' : 'lib/js/tex-svg.js'];
  const html = head + body + '</main>\n' + scripts.map(p => `<script src="${escapeHTML(p)}"></script>`).join('\n') + '\n</body>\n</html>\n';
  // Keep the last valid deck if reading sources or config fails.
  const output = path.join(root, 'index.html');
  await writeAtomic(path.join(root, 'lib/js/deck.js'), bundle);
  await writeAtomic(output, html);
  return config;
}

export async function exportSite(root, config, legacy = false) {
  const output = path.join(root, legacy ? 'dist' : 'dist/site');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const directories = new Set(['lib', ...[...config.styles, ...config.scripts].filter(p => !remote(p)).map(p => p.split('/')[0]),
    'figures', 'assets', 'css', 'js', 'styles']);
  const addAsset = (reference, base = root) => {
    if (/^(?:https?:|data:|\/\/|#)/.test(reference)) return;
    const file = path.resolve(base, decodeURIComponent(reference.split(/[?#]/)[0].replaceAll('&amp;', '&')));
    const relative = path.relative(root, file);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `site asset is outside project: ${reference}`);
    directories.add(relative.split(path.sep)[0]);
  };
  for (const tag of html.matchAll(/<(?:img|script|link|video|audio|source|object)\b[^>]*>/gi)) {
    for (const attr of tag[0].matchAll(/\b(?:src|href|poster|data)="([^"]+)"/g)) addAsset(attr[1]);
  }
  for (const style of ['lib/css/theme.css', 'lib/css/slide.css', ...config.styles].filter(p => !remote(p))) {
    const css = (await readFile(path.join(root, style), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(/url\((["']?)([^"')]+)\1\)/g)) addAsset(match[2], path.dirname(path.join(root, style)));
  }
  if (legacy) {
    for (const dir of directories) await rm(path.join(output, dir), { recursive: true, force: true });
  } else await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'index.html'), path.join(output, 'index.html'));
  for (const dir of directories) {
    if (['dist', 'parts', 'tools', 'tests', '.git'].includes(dir)) continue;
    try { await access(path.join(root, dir)); } catch { continue; }
    await cp(path.join(root, dir), path.join(output, dir), { recursive: true, filter: p => path.basename(p) !== '.DS_Store' });
  }
  if (config.mathjax.mode === 'cdn') await rm(path.join(output, 'lib/js/tex-svg.js'), { force: true });
  return output;
}
