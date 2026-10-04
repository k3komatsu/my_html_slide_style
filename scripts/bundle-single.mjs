#!/usr/bin/env node
// index.htmlのCSS・JS・図を埋め込み、外部参照のない1ファイルのHTMLを書き出す。
// 使い方: node scripts/bundle-single.mjs [元HTML] [出力先]
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [source = 'index.html', output = 'dist/slide.html'] = process.argv.slice(2);
const MIME = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff2': 'font/woff2',
};
const dataURI = file =>
  `data:${MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`;

let html = readFileSync(source, 'utf8');
let hasRemote = /<(?:script|link|img)\b[^>]*\b(?:src|href)=["'](?:https?:|\/\/)/.test(html);

// スタイルシート: url(...)をdata URIに置き換えてから<style>にする。CDNの参照はそのまま残す。
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (tag, href) => {
  if (/^(?:https?:)?\/\//.test(href)) return tag;
  const file = path.resolve(path.dirname(source), href);
  const css = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '') // コメント内のurl(...)は対象外
    .replace(/url\((["']?)([^"')]+)\1\)/g, (match, quote, url) => {
      if (/^(?:https?:|\/\/)/.test(url)) hasRemote = true;
      return /^(?:data:|https?:|\/\/|#)/.test(url) ? match : `url("${dataURI(path.resolve(path.dirname(file), url))}")`;
    });
  return `<style>\n${css}\n</style>`;
});

// スクリプト: </scriptをエスケープしてから<script>にする。CDNの参照はそのまま残す。
html = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, src) =>
  /^(?:https?:)?\/\//.test(src) ? tag : `<script>\n${readFileSync(path.resolve(path.dirname(source), src), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`);

// 画像: HTMLからの相対パスでdata URIにする。
html = html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g, (tag, head, src, tail) =>
  /^(?:data:|https?:|\/\/)/.test(src) ? tag : head + dataURI(path.resolve(path.dirname(source), src)) + tail);

// ponytail: @import・srcset・外部URLのフォントには未対応。必要になったら追加する。
assert(!/<link\b[^>]*\bhref="(?!https?:|\/\/)/.test(html)
  && !/<script src="(?!https?:|\/\/)/.test(html)
  && !/<img\b[^>]*\bsrc="(?!data:|https?:|\/\/)/.test(html), 'ローカルの外部参照が残っています');

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, html);
const mb = Buffer.byteLength(html) / 1024 / 1024;
const size = mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(mb * 1024)}KB`;
console.log(`${output} を書き出しました（${size}${hasRemote ? '、外部参照あり' : '、外部参照なし'}）`);
