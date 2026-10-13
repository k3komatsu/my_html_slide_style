import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import '../lib/js/visibility-model.js';

export const model = globalThis.SlideVisibilityModel;
export const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name) => {
  if (!name.startsWith('#')) return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[name.toLowerCase()];
  const code = parseInt(name.slice(/^#x/i.test(name) ? 2 : 1), /^#x/i.test(name) ? 16 : 10);
  return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '\ufffd';
});
const attribute = (tag, name) => {
  const attributes = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of tag.matchAll(attributes)) {
    if (match[1].toLowerCase() === name) return decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return null;
};

// Match balanced sections, including nested sections and comments. No DOM package needed.
export function slideSections(html) {
  const slides = [];
  let depth = 0, current;
  const tags = /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<(\/?)section\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  for (const match of html.matchAll(tags)) {
    if (/^<!--|^<(?:script|style)\b/i.test(match[0])) continue;
    if (match[1]) {
      if (current && depth === current.depth) {
        current.end = match.index + match[0].length;
        current.html = html.slice(current.start, current.end);
        slides.push(current); current = undefined;
      }
      depth--;
    } else {
      depth++;
      if (attribute(match[0], 'class')?.split(/\s+/).includes('slide')) {
        assert(!current, 'Slides must not be nested');
        current = { start: match.index, tag: match[0], depth,
          id: attribute(match[0], 'data-slide-id') || attribute(match[0], 'id') };
      }
    }
  }
  assert(!current, 'Unclosed slide section');
  return slides;
}

export function identifySlides(html) {
  const used = new Set(), counts = new Map();
  for (const slide of slideSections(html).reverse()) {
    if (!slide.id) {
      const base = 'slide-' + createHash('sha256').update(slide.html).digest('hex').slice(0, 20);
      const count = (counts.get(base) ?? 0) + 1; counts.set(base, count);
      slide.id = base + (count > 1 ? `-${count}` : '');
    }
    assert(!used.has(slide.id), `Duplicate slide identity: ${slide.id}`); used.add(slide.id);
    if (!attribute(slide.tag, 'data-slide-id')) {
      const tag = slide.tag.slice(0, -1) + ` data-slide-id="${escape(slide.id)}">`;
      html = html.slice(0, slide.start) + tag + html.slice(slide.start + slide.tag.length);
    }
  }
  return html;
}

export async function loadSettings(root, filename = 'slide.visibility.json', optional = true) {
  try { return model.normalize(JSON.parse(await readFile(path.resolve(root, filename), 'utf8'))); }
  catch (error) {
    if (optional && error.code === 'ENOENT') return model.normalize();
    throw error;
  }
}
export function embeddedSettings(html) {
  const data = html.match(/<script id="slide-visibility-settings" type="application\/json">([\s\S]*?)<\/script>/);
  return model.normalize(data ? JSON.parse(data[1]) : undefined);
}
export async function exportSelection(source, { settings: filename, mode } = {}) {
  const html = await readFile(source, 'utf8');
  const settings = filename ? await loadSettings(process.cwd(), filename, false) : embeddedSettings(html);
  const selected = model.resolveMode(settings, mode ?? settings.defaultMode);
  const slides = slideSections(html);
  assert(slides.length && (slides.every(slide => slide.id) || !Object.keys(settings.hidden).length), 'Build the deck before exporting display modes');
  const visible = slides.filter(slide => model.visible(settings, slide.id, selected));
  assert(visible.length, '選択した表示モードには表示するスライドがありません');
  const missing = Object.keys(settings.hidden).filter(id => !slides.some(slide => slide.id === id));
  assert(!missing.length, `表示設定の対象スライドが見つかりません: ${missing.join(', ')}。設定ファイルを更新してください`);
  return { html, settings, selected, slides, visible };
}
export function selectedHtml(selection, fixed) {
  let { html, settings, selected, slides } = selection;
  if (fixed) {
    for (const slide of [...slides].reverse()) {
      if (!model.visible(settings, slide.id, selected)) html = html.slice(0, slide.start) + html.slice(slide.end);
    }
  }
  const label = settings.modes.find(mode => mode.id === selected)?.name ?? '全表示';
  const exportedSettings = fixed ? model.normalize() : settings;
  html = html.replace(/(<script id="slide-visibility-settings" type="application\/json">)[\s\S]*?(<\/script>)/,
    (_, head, tail) => head + json(exportedSettings) + tail);
  const override = fixed ? { settings: exportedSettings, fixed: label, exporting: true } : { settings };
  return html.replace('</head>', `<script>window.SlideVisibilityOverride = ${json(override)};</script>\n</head>`);
}

export function parseSelectionArgs(args) {
  const positional = [], options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mode' || arg === '--settings') {
      const key = arg.slice(2);
      assert(options[key] === undefined && args[i + 1] && !args[i + 1].startsWith('--'), `${arg} needs one value`);
      options[key] = args[++i];
    } else if (arg === '--all-modes' || arg === '--cdn') {
      const key = arg === '--all-modes' ? 'allModes' : 'cdn';
      assert(!options[key], `Duplicate option: ${arg}`); options[key] = true;
    } else { assert(!arg.startsWith('--'), `Unknown option: ${arg}`); positional.push(arg); }
  }
  assert(!(options.allModes && options.mode !== undefined), '--mode and --all-modes cannot be combined');
  return { positional, options };
}
