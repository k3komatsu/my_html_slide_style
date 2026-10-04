import { openBrowser } from './browser.mjs';

// Runs in the page, independent of template/sample metadata and slide count.
async function inspectDeck() {
  const issues = [], slides = [...document.querySelectorAll('.slide')];
  const issue = (level, code, el, detail) => {
    const slide = el?.closest?.('.slide');
    issues.push({ level, code, slide: slide ? slides.indexOf(slide) + 1 : null,
      element: el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].join('.') : '') : null, detail });
  };
  if (!slides.length) issue('ERROR', 'no-slides', null, 'No .slide elements found');
  if (document.querySelector('script[src*="tex-svg"]') && !window.MathJax?.startup?.promise) issue('ERROR', 'mathjax-load', null, 'MathJax did not initialize');
  for (const el of document.querySelectorAll('mjx-merror, [data-mjx-error], [data-mml-node="merror"]')) issue('ERROR', 'mathjax', el, el.textContent);
  const ids = new Set();
  for (const el of document.querySelectorAll('[id]')) {
    if (ids.has(el.id)) issue('ERROR', 'duplicate-id', el, el.id);
    ids.add(el.id);
  }
  for (const img of document.images) {
    if (!img.complete || !img.naturalWidth) issue('ERROR', 'image-load', img, img.getAttribute('src'));
    if (!img.hasAttribute('alt')) issue('WARN', 'image-alt', img, 'Image has no alt attribute');
  }
  for (const a of document.querySelectorAll('a[href]')) {
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash || url.hash === '#') continue;
    let id;
    try { id = decodeURIComponent(url.hash.slice(1)); } catch { issue('ERROR', 'internal-link', a, a.getAttribute('href')); continue; }
    if (!document.getElementById(id) && !(/^\d+$/.test(id) && Number(id) >= 1 && Number(id) <= slides.length)) issue('ERROR', 'internal-link', a, a.getAttribute('href'));
  }
  const original = window.SlideDeck?.current;
  const rootStyle = getComputedStyle(document.documentElement);
  const safe = Object.fromEntries(['left', 'right', 'top', 'bottom'].map(key => [key, parseFloat(rootStyle.getPropertyValue('--safe-' + key)) || 0]));
  const wasOverview = document.documentElement.classList.contains('overview');
  if (wasOverview) SlideDeck.toggleOverview();
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (window.SlideDeck) SlideDeck.show(i); else slide.classList.add('is-current');
    const bounds = slide.getBoundingClientRect(), scale = bounds.width / slide.offsetWidth;
    if (!scale) { issue('ERROR', 'slide-hidden', slide, 'Slide has no visible dimensions'); continue; }
    const width = slide.clientWidth, height = slide.clientHeight;
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { x: (r.left - bounds.left) / scale, y: (r.top - bounds.top) / scale, w: r.width / scale, h: r.height / scale };
    };
    const footer = parseFloat(getComputedStyle(slide, '::before').height) || 0;
    const page = slide.querySelector('.slide-page'), p = page && rect(page);
    for (const el of slide.querySelectorAll('*')) {
      if (el.closest('.slide-page, .menu, .logo-btn, .sim-pop, .notes, mjx-container *, svg *')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || !el.getClientRects().length) continue;
      const r = rect(el);
      if (!r.w || !r.h) continue;
      const detail = `x=${Math.round(r.x)} y=${Math.round(r.y)} width=${Math.round(r.w)} height=${Math.round(r.h)}`;
      if (r.x < -1 || r.y < -1 || r.x + r.w > width + 1 || r.y + r.h > height + 1) issue('WARN', 'outside-slide', el, detail);
      if (r.y + r.h > height - footer + 1) issue('WARN', 'footer-overlap', el, detail);
      if (p) {
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        const dx = cx - Math.max(r.x, Math.min(cx, r.x + r.w)), dy = cy - Math.max(r.y, Math.min(cy, r.y + r.h));
        if (dx * dx + dy * dy < (p.w / 2) ** 2) issue('WARN', 'page-overlap', el, detail);
      }
      const constrainedHeight = style.overflowY !== 'visible' || el.matches('.content, .stack, .row, .columns, .grid');
      if ((el.scrollWidth > el.clientWidth + 2 || (constrainedHeight && el.scrollHeight > el.clientHeight + 2)) && el.clientWidth && !el.matches('svg, mjx-container')) issue('WARN', 'text-overflow', el, detail);
      if (el.matches('.slide__title') && r.x + Math.max(r.w, el.scrollWidth) > width - safe.right) issue('WARN', 'title-overflow', el, detail);
      if (!slide.matches('.slide--cover, .slide--section') && el.matches('.box, .fig, .callout, .note-box, .content') &&
        (r.x < safe.left - 1 || r.y < safe.top - 1 || r.x + r.w > width - safe.right + 1 || r.y + r.h > height - safe.bottom + 1)) issue('WARN', 'safe-area', el, detail);
    }
    // Exercise standard parameter popovers without changing their values.
    for (const host of slide.querySelectorAll('.sim-src')) {
      host.click();
      const pop = slide.querySelector('.sim-pop');
      if (pop) {
        const r = rect(pop);
        if (r.x < 0 || r.y < 0 || r.x + r.w > width || r.y + r.h > height) issue('WARN', 'popover-overflow', host, JSON.stringify(r));
      }
      window.simPopover?.close();
    }
    if (!window.SlideDeck) slide.classList.remove('is-current');
  }
  if (original !== undefined) SlideDeck.show(original);
  if (wasOverview) SlideDeck.toggleOverview();
  return { slides: slides.length, math: document.querySelectorAll('mjx-container').length, issues };
}

export async function check(target, { allowExternal = false } = {}) {
  const browser = await openBrowser({ offline: !allowExternal });
  try {
    await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false });
    await browser.load(target);
    const report = await browser.evaluate(`(${inspectDeck.toString()})()`);
    for (const e of browser.errors) report.issues.push({ level: 'ERROR', code: 'javascript', detail: e.exception?.description ?? e.text });
    for (const e of browser.failed) report.issues.push({ level: 'ERROR', code: 'asset-load', detail: `${e.url ?? ''} ${e.errorText}` });
    if (!allowExternal) for (const url of new Set(browser.external)) report.issues.push({ level: 'ERROR', code: 'external-network', detail: url });
    return report;
  } finally { browser.close(); }
}

export function printReport(report) {
  console.log(`${report.slides} slides; ${report.math} MathJax expressions`);
  for (const item of report.issues) console.log(`${item.level}${item.slide ? ` slide ${item.slide}` : ''}: ${item.code}${item.element ? ` ${item.element}` : ''}\n  ${item.detail}`);
  const errors = report.issues.filter(i => i.level === 'ERROR').length, warnings = report.issues.filter(i => i.level === 'WARN').length;
  console.log(`${errors} errors; ${warnings} warnings`);
  return errors ? 1 : 0;
}
