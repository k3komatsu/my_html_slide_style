/* Generated from lib/runtime/*.js by tools/slide.mjs build. */
(() => {
const slides = [...document.querySelectorAll(".slide")];
if (!slides.length) return;
let cur = 0, deckBottom = 0;   // deckBottom: 通常表示でスライドの下に確保するキー案内の高さ
const events = new EventTarget();
const emit = (name, detail) => events.dispatchEvent(new CustomEvent(name, { detail }));
function on(name, listener) {
  const handler = event => listener(event.detail);
  events.addEventListener(name, handler);
  return () => events.removeEventListener(name, handler);
}
const features = { overview: true, menu: true, laser: true, scroll: true, ...window.SlideConfig?.features };
if (window.SlideVisibilityOverride?.exporting) features.scroll = false;   // PDF出力は全スライドを is-current にして1枚ずつ描くため連続表示にしない
if (!features.menu) document.documentElement.classList.add('without-menu');
const geometryStyle = getComputedStyle(document.documentElement);
const geometry = Object.freeze({
  width: parseFloat(geometryStyle.getPropertyValue('--slide-width')),
  height: parseFloat(geometryStyle.getPropertyValue('--slide-height')),
});
if (!(geometry.width > 0 && geometry.height > 0)) throw new Error('Invalid slide geometry');

const visibilityModel = window.SlideVisibilityModel;
const visibilityOverride = window.SlideVisibilityOverride;
const visibilityBase = visibilityModel.normalize(JSON.parse(document.getElementById('slide-visibility-settings')?.textContent || 'null') ?? undefined);
const visibilityKey = 'html-slide-visibility-v1:' + location.pathname;
let visibilitySettings = visibilityModel.normalize(visibilityOverride?.settings ?? visibilityBase);
let visibilityStorageBlocked = false, visibilityMessage = '';
let visibilityDialog;
const visibilityFixed = visibilityOverride?.fixed;
if (!visibilityOverride?.exporting) {
  try {
    const stored = localStorage.getItem(visibilityKey);
    if (stored) visibilitySettings = visibilityModel.normalize(JSON.parse(stored));
  } catch {
    visibilityStorageBlocked = true;
    visibilityMessage = 'ブラウザの保存データを読み込めません。元のデータを保持し、変更は画面内だけで保持します。設定を書き出してください。';
  }
}
if (visibilityOverride?.mode !== undefined) visibilitySettings.defaultMode = visibilityModel.resolveMode(visibilitySettings, visibilityOverride.mode);
const isVisible = slide => visibilityModel.visible(visibilitySettings, slide.dataset.slideId || slide.id, visibilitySettings.defaultMode);
function visibleIndices() { return slides.flatMap((slide, index) => isVisible(slide) ? [index] : []); }
if (!visibleIndices().length) {
  if (visibilityOverride?.exporting) throw new Error('選択した表示モードには表示するスライドがありません');
  visibilitySettings.defaultMode = '';
  visibilityMessage = '表示するスライドがないため全表示に戻しました。非表示条件を確認してください。';
}
function markVisibility() {
  const last = visibleIndices().at(-1);
  slides.forEach((slide, index) => {
    slide.classList.toggle('is-mode-hidden', !isVisible(slide));
    slide.classList.toggle('is-last-visible', index === last);
  });
}
markVisibility();
function missingVisibilityIds() {
  const ids = new Set(slides.map(slide => slide.dataset.slideId || slide.id));
  return Object.keys(visibilitySettings.hidden).filter(id => !ids.has(id));
}
function visibilityNotice() {
  const missing = missingVisibilityIds().length;
  const text = visibilityMessage || (missing ? `${missing}件の非表示条件の対象が見つかりません。スライドの編集・削除を確認してください。` : 'このブラウザに自動保存します。配布やPDF出力に使う設定は書き出してください。');
  document.querySelectorAll('.visibility-status').forEach(node => { node.textContent = text; });
  document.querySelectorAll('.visibility-edit').forEach(button => {
    button.textContent = visibilityMessage || missing ? '設定 ⚠' : '設定';
    button.title = text;
  });
}
function saveVisibility() {
  if (visibilityOverride?.exporting) return;
  if (!visibilityStorageBlocked) {
    try { localStorage.setItem(visibilityKey, JSON.stringify(visibilitySettings)); visibilityMessage = ''; }
    catch { visibilityMessage = 'ブラウザに保存できません。変更は画面内で保持します。設定を書き出してください。'; }
  }
  visibilityNotice();
}
function updateModeSelectors() {
  document.querySelectorAll('.visibility-mode').forEach(select => {
    select.replaceChildren(new Option(visibilityFixed || '全表示', ''));
    if (!visibilityFixed) for (const mode of visibilitySettings.modes) select.add(new Option(mode.name, mode.id));
    select.value = visibilitySettings.defaultMode;
    select.disabled = !!visibilityFixed;
  });
  updateSlideVisibilityControls();
}
function visibilityCheckbox(slide, index, mode) {
  const id = slide.dataset.slideId || slide.id;
  const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'visibility-hide';
  check.dataset.slideId = id; check.dataset.modeId = mode.id;
  check.checked = visibilitySettings.hidden[id]?.includes(mode.id) ?? false;
  const title = slide.querySelector('h1, h2')?.textContent.trim() || '無題';
  check.setAttribute('aria-label', `${index + 1} ${title}を${mode.name}モードで非表示`);
  check.addEventListener('change', () => {
    const checked = check.checked, previous = cur;
    const keepMenu = check.closest('.menu') && slide.classList.contains('is-menu');
    const changed = editVisibility(next => {
      const list = new Set(next.hidden[id] || []);
      if (checked) list.add(mode.id); else list.delete(mode.id);
      next.hidden[id] = [...list];
    }, false, !!keepMenu);
    if (!changed) check.checked = !checked;
    if (changed && keepMenu && cur === previous) {
      check.focus({ preventScroll: true });
    }
  });
  return check;
}
function updateSlideVisibilityControls() {
  const signature = JSON.stringify(visibilitySettings.modes);
  document.querySelectorAll('.menu__slide-visibility').forEach(group => {
    if (group.dataset.modes === signature) return;
    const slide = group.closest('.slide'), index = slides.indexOf(slide);
    const legend = document.createElement('legend'); legend.textContent = 'このスライドの非表示条件';
    group.replaceChildren(legend); group.dataset.modes = signature;
    for (const mode of visibilitySettings.modes) {
      const label = document.createElement('label');
      label.append(visibilityCheckbox(slide, index, mode), document.createTextNode(`非表示：${mode.name}`));
      group.append(label);
    }
    if (!visibilitySettings.modes.length) {
      const note = document.createElement('p'); note.textContent = '「設定」で表示モードを追加してください。'; group.append(note);
    }
  });
  document.querySelectorAll('.visibility-hide').forEach(check => {
    check.checked = visibilitySettings.hidden[check.dataset.slideId]?.includes(check.dataset.modeId) ?? false;
  });
}
function setVisibilitySettings(value, keepMenu = false) {
  if (visibilityFixed) throw new Error('このHTMLは指定モードで書き出されています');
  const next = visibilityModel.normalize(value);
  if (!slides.some(slide => visibilityModel.visible(next, slide.dataset.slideId || slide.id, next.defaultMode))) {
    throw new Error('このモードには表示するスライドがありません。少なくとも1枚は表示してください。');
  }
  visibilitySettings = next;
  window.simPopover?.close();
  markVisibility(); updatePagination(true); updateModeSelectors();
  if (keepMenu && isVisible(slides[cur])) { updateLaser(); updateFocusNotice(); }
  else show(cur);
  updateMinimap(); saveVisibility();
  emit('visibilitychange', { mode: visibilitySettings.defaultMode, slides: slides.filter(isVisible) });
}
function setVisibilityMode(mode) {
  setVisibilitySettings({ ...visibilitySettings, defaultMode: visibilityModel.resolveMode(visibilitySettings, mode) });
}
function editVisibility(change, render = true, keepMenu = false) {
  try {
    const next = visibilityModel.normalize(visibilitySettings);
    change(next); setVisibilitySettings(next, keepMenu);
    if (render) renderVisibilityEditor();
    return true;
  } catch (error) {
    updateModeSelectors();
    if (visibilityDialog?.open) visibilityDialog.querySelector('.visibility-status').textContent = error.message;
    else alert(error.message);
    return false;
  }
}
function addVisibilityControls(menu) {
  const row = document.createElement('div'); row.className = 'menu__visibility';
  const label = document.createElement('label'); label.textContent = '表示モード ';
  const select = document.createElement('select'); select.className = 'visibility-mode';
  select.addEventListener('change', () => editVisibility(next => { next.defaultMode = select.value; }, false));
  label.append(select); row.append(label);
  if (!visibilityFixed) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'visibility-edit'; button.textContent = '設定';
    button.addEventListener('click', openVisibilitySettings); row.append(button);
  }
  menu.append(row);
  if (!visibilityFixed) {
    const group = document.createElement('fieldset'); group.className = 'menu__slide-visibility'; menu.append(group);
  }
}
function downloadVisibilitySettings() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(visibilitySettings, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'slide.visibility.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderVisibilityEditor() {
  const modes = visibilityDialog.querySelector('.visibility-modes'); modes.replaceChildren();
  for (const mode of visibilitySettings.modes) {
    const row = document.createElement('div');
    const input = document.createElement('input'); input.value = mode.name; input.maxLength = 60; input.setAttribute('aria-label', `${mode.name}の名前`);
    input.addEventListener('change', () => {
      if (!editVisibility(next => { next.modes.find(item => item.id === mode.id).name = input.value; })) input.value = mode.name;
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '削除'; remove.setAttribute('aria-label', `${mode.name}モードを削除`);
    remove.addEventListener('click', () => {
      if (!confirm(`「${mode.name}」モードと、このモードの非表示条件を削除しますか？`)) return;
      editVisibility(next => {
        next.modes = next.modes.filter(item => item.id !== mode.id);
        for (const list of Object.values(next.hidden)) { const index = list.indexOf(mode.id); if (index >= 0) list.splice(index, 1); }
        if (next.defaultMode === mode.id) next.defaultMode = '';
      });
    });
    row.append(input, remove); modes.append(row);
  }
  const table = visibilityDialog.querySelector('table'); table.replaceChildren();
  const head = table.createTHead().insertRow();
  const titleHead = document.createElement('th'); titleHead.textContent = 'スライド'; titleHead.scope = 'col'; head.append(titleHead);
  for (const mode of visibilitySettings.modes) {
    const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = `非表示：${mode.name}`; head.append(cell);
  }
  const body = table.createTBody();
  slides.forEach((slide, index) => {
    const row = body.insertRow();
    const title = slide.querySelector('h1, h2')?.textContent.trim() || '無題';
    const cell = document.createElement('th'); cell.scope = 'row'; cell.textContent = `${index + 1}　${title}`; row.append(cell);
    for (const mode of visibilitySettings.modes) {
      row.insertCell().append(visibilityCheckbox(slide, index, mode));
    }
  });
  visibilityDialog.querySelector('.visibility-clean').hidden = !missingVisibilityIds().length;
  updateModeSelectors(); visibilityNotice();
}
function openVisibilitySettings() {
  if (visibilityFixed) return;
  if (!visibilityDialog) {
    visibilityDialog = document.createElement('dialog'); visibilityDialog.className = 'visibility-dialog interactive';
    visibilityDialog.setAttribute('aria-labelledby', 'visibility-heading');
    visibilityDialog.innerHTML = '<header><h2 id="visibility-heading">スライドの表示設定</h2><button type="button" class="visibility-close" aria-label="表示設定を閉じる">×</button></header>'
      + '<p>チェックしたモードでは非表示になります。全表示では、すべてのスライドを表示します。</p>'
      + '<div class="visibility-toolbar"><label>表示モード <select class="visibility-mode"></select></label><button type="button" class="visibility-download">設定を書き出す</button>'
      + '<span class="visibility-import"><button type="button">設定を読み込む</button><input type="file" accept=".json,application/json" hidden></span></div>'
      + '<form class="visibility-add"><label>モード名 <input name="mode" maxlength="60" required placeholder="例：授業"></label><button type="submit">モードを追加</button></form>'
      + '<div class="visibility-modes"></div><p class="visibility-status" role="status"></p><button type="button" class="visibility-clean" hidden>見つからない非表示条件を削除</button>'
      + '<div class="visibility-table"><table></table></div>';
    document.body.append(visibilityDialog);
    visibilityDialog.querySelector('.visibility-close').addEventListener('click', () => visibilityDialog.close());
    visibilityDialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); visibilityDialog.close(); }
    });
    visibilityDialog.addEventListener('close', () => { slides[cur].focus({ preventScroll: true }); updateFocusNotice(); updateLaser(); });
    visibilityDialog.querySelector('.visibility-mode').addEventListener('change', event => editVisibility(next => { next.defaultMode = event.target.value; }, false));
    visibilityDialog.querySelector('.visibility-download').addEventListener('click', downloadVisibilitySettings);
    visibilityDialog.querySelector('.visibility-import button').addEventListener('click', () => visibilityDialog.querySelector('.visibility-import input').click());
    visibilityDialog.querySelector('.visibility-import input').addEventListener('change', async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        const next = visibilityModel.normalize(JSON.parse(await file.text()));
        const ids = new Set(slides.map(slide => slide.dataset.slideId || slide.id));
        if (Object.keys(next.hidden).some(id => !ids.has(id))) throw new Error('この資料にないスライドの非表示条件が含まれています');
        setVisibilitySettings(next); renderVisibilityEditor();
      } catch (error) { visibilityDialog.querySelector('.visibility-status').textContent = error.message; }
      event.target.value = '';
    });
    visibilityDialog.querySelector('.visibility-add').addEventListener('submit', event => {
      event.preventDefault(); const input = event.target.elements.mode;
      if (editVisibility(next => next.modes.push({ id: 'mode-' + crypto.randomUUID(), name: input.value }))) input.value = '';
    });
    visibilityDialog.querySelector('.visibility-clean').addEventListener('click', () => {
      if (!confirm('この資料に見つからないスライドの非表示条件だけを削除しますか？')) return;
      editVisibility(next => { for (const id of missingVisibilityIds()) delete next.hidden[id]; });
    });
  }
  window.simPopover?.close(); menuClosers.forEach(close => close());
  renderVisibilityEditor(); visibilityDialog.showModal(); updateFocusNotice(); updateLaser();
}

/* スライド番号：表紙・章扉を除いた連番／総数をMathJaxの分数で表示する。 */
function rebuildPagination() {
  let n = 0;
  const total = slides.filter(s => isVisible(s) && !s.matches('.slide--cover, .slide--section')).length;
  const changed = [];
  for (const s of slides) {
    if (s.classList.contains("slide--cover") || s.classList.contains("slide--section")) s.removeAttribute("data-no");
    else {
      let page = s.querySelector('.slide-page');
      if (!page) {
        page = document.createElement('span'); page.className = 'slide-page'; page.setAttribute('role', 'img');
        const number = document.createElement('span'); number.className = 'slide-page-number'; page.append(number); s.append(page);
      }
      page.hidden = !isVisible(s);
      if (!isVisible(s)) { s.removeAttribute('data-no'); continue; }
      s.dataset.no = ++n;
      const number = page.querySelector('.slide-page-number'), tex = `\\(\\frac{${n}}{${total}}\\)`;
      if (number.dataset.tex !== tex) {
        window.MathJax?.typesetClear?.([number]); number.textContent = tex; number.dataset.tex = tex; changed.push(number);
      }
      page.setAttribute('aria-label', `全${total}ページ中${n}ページ`);
    }
  }
  return changed;
}
function updatePagination(typeset = false) {
  if (!typeset || !window.MathJax?.startup?.promise) { rebuildPagination(); return; }
  paginationTypeset = paginationTypeset.then(async () => {
    await MathJax.startup.promise;
    const changed = rebuildPagination();
    if (changed.length) await MathJax.typesetPromise(changed);
  }).catch(error => console.error(error));
}
let paginationTypeset = Promise.resolve();
updatePagination();

/* 通常表示だけ、スライド外に操作キーを案内する。 */
const keyBindings = document.createElement("aside");
keyBindings.className = "key-bindings"; keyBindings.setAttribute("aria-label", "キーバインド一覧");
keyBindings.innerHTML = '<span><kbd>← / ↑ / PageUp / Backspace</kbd> 前へ</span><span><kbd>→ / ↓ / PageDown / Space / Enter</kbd> 次へ</span>'
  + '<span><kbd>Home / End</kbd> 最初／最後</span><span><kbd>M</kbd> メニュー</span><span><kbd>O</kbd> 一覧</span>'
  + '<span><kbd>F</kbd> 全画面</span><span><kbd>Esc</kbd> メニューを閉じる／全画面を終了</span>'
  + '<span><kbd>⌘ / Ctrl + Shift + R</kbd> 最新版を表示（Chrome）</span>';
document.body.append(keyBindings);
for (const span of keyBindings.children) {
  const key = span.querySelector('kbd').textContent;
  if ((key === 'M' && !features.menu) || (key === 'O' && !features.overview)) span.hidden = true;
}

/* 入力・操作中やウィンドウ外のフォーカスを、全画面でも右下に通知する。 */
const NAV_CONTROLS = "input, select, textarea, button, [contenteditable]:not([contenteditable='false']), [data-slide-control], [role='button']";
const focusNotice = document.createElement("aside"), focusMessage = document.createElement("span"), resume = document.createElement("button");
focusNotice.className = "focus-notice interactive"; focusNotice.hidden = true;
focusMessage.setAttribute("role", "status"); resume.type = "button"; resume.textContent = "ページ送りに戻る";
focusNotice.append(focusMessage, resume); document.body.append(focusNotice);
let pageFocused = document.hasFocus();
function updateFocusNotice() {
  const controls = document.activeElement?.closest?.(NAV_CONTROLS);
  focusNotice.hidden = !!visibilityDialog?.open || document.documentElement.classList.contains("overview") || (pageFocused && !controls);
  focusMessage.textContent = !pageFocused ? "スライドにフォーカスがありません" : "入力・操作中のためページ送り停止";
  const rect = slides[cur].getBoundingClientRect(), scale = rect.width / geometry.width;
  focusNotice.style.right = (innerWidth - rect.right + 72 * scale) + "px";
  focusNotice.style.bottom = (innerHeight - Math.min(rect.bottom, innerHeight - (inScrollView() ? deckBottom : 0)) + 2 * scale) + "px";
  focusNotice.style.maxWidth = (rect.width - 88 * scale) + "px";
}
resume.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });   // ポップアップの先行閉鎖やフォーカス移動で通知が消えるのを防ぐ
resume.addEventListener("click", e => {
  e.stopPropagation(); window.simPopover?.close(); menuClosers.forEach(close => close());
  slides[cur].focus({ preventScroll: true }); updateFocusNotice();
});
document.addEventListener("focusin", updateFocusNotice);
document.addEventListener("focusout", () => queueMicrotask(updateFocusNotice));
addEventListener("focus", () => { pageFocused = true; updateFocusNotice(); });

function indexFromHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return 0; }
  if (/^\d+$/.test(id)) return Number(id) - 1;
  const slide = document.getElementById(id)?.closest('.slide');
  return slide ? slides.indexOf(slide) : 0;
}

/* 通常表示（全画面・一覧以外）は、全スライドを縦に連ねてスクロールさせる。
   cur は表示領域の中央に最も近いスライド。is-current は画面内にあるスライド全部に付け、
   現在のスライドだけで動くデモが画面内のスライドすべてで動くようにする。 */
const html = document.documentElement;
function inScrollView() { return document.documentElement.classList.contains("scroll-view"); }
let scrollLock = null, scrollFrame = 0;
function markCurrent() {
  const live = new Set([cur]);
  if (inScrollView()) visibleIndices().forEach(j => {
    const r = slides[j].getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) live.add(j);
  });
  slides.forEach((s, j) => s.classList.toggle("is-current", live.has(j)));
}
function scrollToCur() {
  const r = slides[cur].getBoundingClientRect();
  scrollTo({ top: scrollY + (r.top + r.bottom) / 2 - (innerHeight - deckBottom) / 2, behavior: "instant" });
  scrollLock = scrollY;   // この位置からの移動だけを利用者のスクロールとして扱う
  markCurrent();
}
function commit(previous, byScroll) {
  slides[cur].tabIndex = -1;
  menuClosers.forEach(close => close());
  if (!byScroll && document.activeElement?.closest?.(".slide") && document.activeElement.closest(".slide") !== slides[cur]) {
    slides[cur].focus({ preventScroll: true });
  }
  updateLaser();
  updateFocusNotice();
  history.replaceState(null, "", "#" + (cur + 1));
  if (html.classList.contains("overview")) { slides[cur].scrollIntoView({ block: "center" }); updateMinimap(); }
  if (cur !== previous) emit('slidechange', { index: cur, slide: slides[cur], previous });
}
function show(i) {
  if (!Number.isInteger(i)) throw new TypeError('Slide index must be an integer');
  const previous = cur;
  const target = Math.max(0, Math.min(slides.length - 1, i)), visible = visibleIndices();
  cur = visible.includes(target) ? target : visible.find(index => index >= target) ?? visible.at(-1);
  markCurrent();
  if (inScrollView()) scrollToCur();
  commit(previous, false);
}
const printing = matchMedia("print");
printing.addEventListener("change", () => { if (!printing.matches && inScrollView()) scrollToCur(); });   // 印刷レイアウトで動いた位置を戻す
function syncScroll() {
  scrollFrame = 0;
  if (!inScrollView() || printing.matches) return;
  markCurrent();
  if (scrollLock !== null && Math.abs(scrollY - scrollLock) < 1) return;   // show() 自身のスクロール
  let best = cur, bestDistance = Infinity;
  for (const j of visibleIndices()) {
    const r = slides[j].getBoundingClientRect(), distance = Math.abs((r.top + r.bottom) / 2 - (innerHeight - deckBottom) / 2);
    if (distance < bestDistance) { best = j; bestDistance = distance; }
  }
  if (best === cur) return;
  const previous = cur;
  cur = best; markCurrent(); commit(previous, true);
}
addEventListener("scroll", () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(syncScroll); }, { passive: true });
function fit() {
  const scrollView = features.scroll && !document.fullscreenElement && !html.classList.contains("overview");
  html.classList.toggle("scroll-view", scrollView);
  keyBindings.hidden = !!document.fullscreenElement || html.classList.contains("overview");
  deckBottom = keyBindings.hidden ? 0 : keyBindings.getBoundingClientRect().height;
  const k = Math.min(html.clientWidth / geometry.width, Math.max(0, innerHeight - deckBottom) / geometry.height);
  html.style.setProperty("--deck-bottom", deckBottom + "px");
  html.style.setProperty("--k", k);
  html.style.setProperty("--scroll-pad", Math.max(18, (innerHeight - deckBottom - geometry.height * k) / 2) + "px");   // どのスライドも中央に置ける余白
  if (scrollView) scrollToCur(); else markCurrent();
  updateLaser();
  updateFocusNotice();
}
addEventListener("resize", fit);
addEventListener("hashchange", () => show(indexFromHash()));
addEventListener("keydown", e => {
  const k = e.key;
  if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
  if (visibilityDialog?.open) return;
  if (features.menu && (k === "m" || k === "M") && !e.ctrlKey && !e.altKey && !e.metaKey && !e.target.closest?.("input, select, textarea, [contenteditable]:not([contenteditable='false'])")) {
    e.preventDefault(); slides[cur].querySelector(".logo-btn")?.click(); return;
  }
  if (e.target.closest?.(NAV_CONTROLS)) return;   // 入力・ボタン・信号点の操作中はページ送りしない
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) advance(1);
  else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) advance(-1);
  else if (k === "Home") show(0);
  else if (k === "End") show(slides.length - 1);
  else if (k.toLowerCase() === "o") toggleOverview();
  else if (k.toLowerCase() === "f") document.documentElement.requestFullscreen?.();
});
slides.forEach((s, j) => s.addEventListener("click", (e) => {
  const overview = document.documentElement.classList.contains("overview");
  if (e.target.closest(".interactive, a, " + NAV_CONTROLS) && !overview) return;
  if (overview) { toggleOverview(); show(j); return; }
  if (inScrollView()) return;   // 連続表示ではクリックでページを送らない
  const { left, width } = s.getBoundingClientRect();
  advance(e.clientX - left < width * 0.05 ? -1 : 1);   // 左端5%は戻る。拡大縮小後の表示幅で判定する
}));
function advance(direction) {
  const visible = visibleIndices(), index = visible.indexOf(cur);
  show(visible[Math.max(0, Math.min(visible.length - 1, index + direction))]);
}

/* ---------- レーザーポインター（表示メニューでOn/Off、操作を遮らない） ---------- */
const laser = document.createElement("div");
laser.className = "laser-pointer"; laser.hidden = true; laser.setAttribute("aria-hidden", "true");
document.body.append(laser);
let laserOn = false, laserPosition = null;
function updateLaser() {
  const rect = slides[cur].getBoundingClientRect();
  laser.hidden = !!visibilityDialog?.open || !laserOn || !laserPosition || document.documentElement.classList.contains("overview")
    || (!inScrollView() && (laserPosition.x < rect.left || laserPosition.x > rect.right || laserPosition.y < rect.top || laserPosition.y > rect.bottom));
  if (!laser.hidden) { laser.style.left = laserPosition.x + "px"; laser.style.top = laserPosition.y + "px"; }
}
function toggleLaser() {
  if (!features.laser) return;
  laserOn = !laserOn; document.body.classList.toggle("is-laser", laserOn);
  document.querySelectorAll(".menu__item--laser").forEach(button => {
    button.setAttribute("aria-pressed", String(laserOn)); button.querySelector(".menu__key").textContent = laserOn ? "On" : "Off";
  });
  updateLaser();
}
document.addEventListener("pointermove", e => {
  laserPosition = e.pointerType === "touch" ? null : { x: e.clientX, y: e.clientY }; updateLaser();
}, { passive: true });
document.addEventListener("pointerout", e => { if (!e.relatedTarget) { laserPosition = null; updateLaser(); } });
addEventListener("blur", () => { pageFocused = false; updateFocusNotice(); laserPosition = null; updateLaser(); });

/* ---------- 右上のアイコンクリックで表示メニュー（全画面・一覧・印刷など） ---------- */
const fsLabel = () => (document.fullscreenElement ? "全画面表示を終了" : "全画面表示");
const MENU_ITEMS = [
  { label: fsLabel(), cls: "menu__item--fs", key: "F", run: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()) },
  { label: "レーザーポインター表示", cls: "menu__item--laser", key: "Off", run: () => toggleLaser() },
  { label: "全スライド一覧表示", key: "O", run: () => toggleOverview() },
  { label: "最初のスライドへ", key: "Home", run: () => show(0) },
  { label: "最後のスライドへ", key: "End", run: () => show(slides.length - 1) },
  { label: "印刷（1スライド = 1ページ）", key: "", run: () => print() },
].filter(item => (item.cls !== 'menu__item--laser' || features.laser) && (item.key !== 'O' || features.overview));
const menuClosers = [];
if (features.menu) slides.forEach((s) => {
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "logo-btn interactive";
  btn.hidden = s.classList.contains("slide--cover") || s.classList.contains("slide--section");   // 表紙・扉はMキーから開く（メニューボタンは非表示）
  btn.setAttribute("aria-label", "表示メニュー（Mキー）"); btn.setAttribute("aria-expanded", "false");
  const menu = document.createElement("aside");
  menu.className = "menu interactive"; menu.inert = true; menu.setAttribute("aria-hidden", "true");
  menu.setAttribute("aria-label", "表示メニュー");
  menu.innerHTML = '<div class="menu__head"><span>メニュー</span><button class="menu__close" type="button" aria-label="閉じる">×</button></div>';
  const setOpen = (open) => {
    s.classList.toggle("is-menu", open); btn.setAttribute("aria-expanded", String(open));
    menu.inert = !open; menu.setAttribute("aria-hidden", String(!open));
  };
  addVisibilityControls(menu);
  MENU_ITEMS.forEach((it) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "menu__item" + (it.cls ? " " + it.cls : "");
    if (it.cls === "menu__item--laser") b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<span>${it.label}</span>` + (it.key ? `<span class="menu__key">${it.key}</span>` : "");
    b.addEventListener("click", () => { it.run(); setOpen(false); });
    menu.append(b);
  });
  menu.querySelector(".menu__close").addEventListener("click", () => setOpen(false));
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!s.classList.contains("is-menu")); });
  menu.addEventListener("click", (e) => e.stopPropagation());   // スライド送りのクリックと混ざらないように
  menuClosers.push(() => setOpen(false));
  s.append(menu, btn);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") menuClosers.forEach((f) => f()); });
document.addEventListener("fullscreenchange", () => {
  document.querySelectorAll(".menu__item--fs > span:first-child").forEach((el) => { el.textContent = fsLabel(); });
  fit();
  emit('fullscreenchange', { enabled: !!document.fullscreenElement });
});

/* ---------- 全スライド一覧（overview）：複数カラム表示とミニマップ ---------- */
function fitOverview() {
  const pad = 62, gap = 18, minCol = 400, maxCols = 5;   // pad は左右の余白計（右はミニマップぶん広い）
  const w = innerWidth;
  const cols = Math.max(1, Math.min(maxCols, Math.floor((w - pad + gap) / (minCol + gap))));
  const k = Math.min(0.7, (w - pad - gap * (cols - 1)) / cols / geometry.width);
  document.documentElement.style.setProperty("--ovk", k.toFixed(3));
  document.documentElement.style.setProperty("--ovgrid", `repeat(${cols}, ${Math.round(geometry.width * k)}px)`);
}
function toggleOverview() {
  if (!features.overview) return;
  document.documentElement.classList.toggle("overview");
  fit();
  fitOverview(); updateMinimap();
  if (document.documentElement.classList.contains('overview')) slides[cur].scrollIntoView({ block: 'center' });
  emit('overviewchange', { enabled: document.documentElement.classList.contains('overview') });
}

const minimap = document.createElement("nav");
minimap.className = "minimap";
minimap.setAttribute("aria-label", "スライド一覧ミニマップ");
const band = document.createElement("span");
band.className = "minimap__band";
const ticks = slides.map((s, j) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "minimap__tick";
  const t = s.querySelector(".slide__title");
  b.title = `${j + 1}${t ? "　" + t.textContent : ""}`;
  b.setAttribute("aria-label", `スライド ${j + 1} へ`);
  b.addEventListener("click", () => show(j));      // overview 中なので show() が scrollIntoView も行う
  return b;
});
minimap.append(band, ...ticks);
if (features.overview) document.body.append(minimap);

function updateMinimap() {
  if (!document.documentElement.classList.contains("overview")) return;
  const html = document.documentElement;
  const total = Math.max(1, html.scrollHeight), view = html.clientHeight;
  const top = Math.min(Math.max(0, scrollY || html.scrollTop), Math.max(0, total - view));
  band.style.top = (top / total) * 100 + "%";
  band.style.height = (Math.min(view, total) / total) * 100 + "%";
  ticks.forEach((b, j) => { b.hidden = !isVisible(slides[j]); b.classList.toggle("is-current", j === cur); });
}
addEventListener("scroll", updateMinimap, { passive: true });
addEventListener("resize", () => { fitOverview(); updateMinimap(); });

updateModeSelectors(); visibilityNotice();
fit();
show(indexFromHash());

window.SlideDeck = {
  show, toggleOverview, on,
  geometry,
  visibility: {
    setMode: setVisibilityMode, openSettings: openVisibilitySettings,
    get mode() { return visibilitySettings.defaultMode; },
    get settings() { return visibilityModel.normalize(visibilitySettings); },
    get visibleSlides() { return slides.filter(isVisible); }
  },
  get current() { return cur; },
  get slides() { return [...slides]; }
};
addEventListener('beforeprint', () => emit('beforeprint', {}));
})();
