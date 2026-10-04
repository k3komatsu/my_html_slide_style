/* 元リポジトリのdeck.jsから抽出。公開APIはwindow.SlideDeck。 */
(() => {
/* deck.js — 拡大縮小・ページ送り・一覧表示 (依存なし) */
const slides = [...document.querySelectorAll(".slide")];
if (!slides.length) return;
let cur = 0;

/* スライド番号：表紙・章扉を除いた連番／総数をMathJaxの分数で表示する。 */
(() => {
  let n = 0;
  const total = slides.filter(s => !s.classList.contains("slide--cover") && !s.classList.contains("slide--section")).length;
  for (const s of slides) {
    if (s.classList.contains("slide--cover") || s.classList.contains("slide--section")) s.removeAttribute("data-no");
    else {
      s.dataset.no = ++n;   // 扉は番号を消費しない
      const page = document.createElement("span"); page.className = "slide-page";
      page.textContent = `\\(\\frac{${n}}{${total}}\\)`;
      page.setAttribute("role", "img"); page.setAttribute("aria-label", `全${total}ページ中${n}ページ`);
      s.append(page);   // 本文と同じMathJaxの初期タイプセットで描画する
    }
  }
})();

/* 通常表示だけ、スライド外に操作キーを案内する。 */
const keyBindings = document.createElement("aside");
keyBindings.className = "key-bindings"; keyBindings.setAttribute("aria-label", "キーバインド一覧");
keyBindings.innerHTML = '<span><kbd>← / ↑ / PageUp / Backspace</kbd> 前へ</span><span><kbd>→ / ↓ / PageDown / Space / Enter</kbd> 次へ</span>'
  + '<span><kbd>Home / End</kbd> 最初／最後</span><span><kbd>M</kbd> メニュー</span><span><kbd>O</kbd> 一覧</span>'
  + '<span><kbd>F</kbd> 全画面</span><span><kbd>Esc</kbd> メニューを閉じる／全画面を終了</span>'
  + '<span><kbd>⌘ / Ctrl + Shift + R</kbd> 最新版を表示（Chrome）</span>';
document.body.append(keyBindings);

/* 入力・操作中やウィンドウ外のフォーカスを、全画面でも右下に通知する。 */
const NAV_CONTROLS = "input, select, textarea, button, [contenteditable]:not([contenteditable='false']), [data-slide-control], [role='button']";
const focusNotice = document.createElement("aside"), focusMessage = document.createElement("span"), resume = document.createElement("button");
focusNotice.className = "focus-notice interactive"; focusNotice.hidden = true;
focusMessage.setAttribute("role", "status"); resume.type = "button"; resume.textContent = "ページ送りに戻る";
focusNotice.append(focusMessage, resume); document.body.append(focusNotice);
let pageFocused = document.hasFocus();
function updateFocusNotice() {
  const controls = document.activeElement?.closest?.(NAV_CONTROLS);
  focusNotice.hidden = document.documentElement.classList.contains("overview") || (pageFocused && !controls);
  focusMessage.textContent = !pageFocused ? "スライドにフォーカスがありません" : "入力・操作中のためページ送り停止";
  const rect = slides[cur].getBoundingClientRect(), scale = rect.width / 960;
  focusNotice.style.right = (innerWidth - rect.right + 72 * scale) + "px";
  focusNotice.style.bottom = (innerHeight - rect.bottom + 2 * scale) + "px";
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

function show(i) {
  cur = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, j) => s.classList.toggle("is-current", j === cur));
  slides[cur].tabIndex = -1;
  menuClosers.forEach(close => close());
  if (document.activeElement?.closest?.(".slide") && document.activeElement.closest(".slide") !== slides[cur]) {
    slides[cur].focus({ preventScroll: true });
  }
  updateLaser();
  updateFocusNotice();
  history.replaceState(null, "", "#" + (cur + 1));
  if (document.documentElement.classList.contains("overview")) { slides[cur].scrollIntoView({ block: "center" }); updateMinimap(); }
}
function fit() {
  keyBindings.hidden = !!document.fullscreenElement || document.documentElement.classList.contains("overview");
  const bottom = keyBindings.hidden ? 0 : keyBindings.getBoundingClientRect().height;
  const k = Math.min(innerWidth / 960, Math.max(0, innerHeight - bottom) / 540);
  document.documentElement.style.setProperty("--deck-bottom", bottom + "px");
  document.documentElement.style.setProperty("--k", k);
  updateLaser();
  updateFocusNotice();
}
addEventListener("resize", fit);
addEventListener("hashchange", () => show((parseInt(location.hash.slice(1)) || 1) - 1));
addEventListener("keydown", e => {
  const k = e.key;
  if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
  if ((k === "m" || k === "M") && !e.ctrlKey && !e.altKey && !e.metaKey && !e.target.closest?.("input, select, textarea, [contenteditable]:not([contenteditable='false'])")) {
    e.preventDefault(); slides[cur].querySelector(".logo-btn")?.click(); return;
  }
  if (e.target.closest?.(NAV_CONTROLS)) return;   // 入力・ボタン・信号点の操作中はページ送りしない
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) show(cur + 1);
  else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) show(cur - 1);
  else if (k === "Home") show(0);
  else if (k === "End") show(slides.length - 1);
  else if (k.toLowerCase() === "o") toggleOverview();
  else if (k.toLowerCase() === "f") document.documentElement.requestFullscreen?.();
});
slides.forEach((s, j) => s.addEventListener("click", (e) => {
  const overview = document.documentElement.classList.contains("overview");
  if (e.target.closest(".interactive, a, " + NAV_CONTROLS) && !overview) return;
  if (overview) { document.documentElement.classList.remove("overview"); fit(); show(j); return; }
  const { left, width } = s.getBoundingClientRect();
  show(cur + (e.clientX - left < width * 0.05 ? -1 : 1));   // 左端5%は戻る。拡大縮小後の表示幅で判定する
}));

/* ---------- レーザーポインター（表示メニューでOn/Off、操作を遮らない） ---------- */
const laser = document.createElement("div");
laser.className = "laser-pointer"; laser.hidden = true; laser.setAttribute("aria-hidden", "true");
document.body.append(laser);
let laserOn = false, laserPosition = null;
function updateLaser() {
  const rect = slides[cur].getBoundingClientRect();
  laser.hidden = !laserOn || !laserPosition || document.documentElement.classList.contains("overview")
    || laserPosition.x < rect.left || laserPosition.x > rect.right || laserPosition.y < rect.top || laserPosition.y > rect.bottom;
  if (!laser.hidden) { laser.style.left = laserPosition.x + "px"; laser.style.top = laserPosition.y + "px"; }
}
function toggleLaser() {
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
];
const menuClosers = [];
slides.forEach((s) => {
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
});

/* ---------- 全スライド一覧（overview）：複数カラム表示とミニマップ ---------- */
function fitOverview() {
  const pad = 62, gap = 18, minCol = 400, maxCols = 5;   // pad は左右の余白計（右はミニマップぶん広い）
  const w = innerWidth;
  const cols = Math.max(1, Math.min(maxCols, Math.floor((w - pad + gap) / (minCol + gap))));
  const k = Math.min(0.7, (w - pad - gap * (cols - 1)) / cols / 960);
  document.documentElement.style.setProperty("--ovk", k.toFixed(3));
  document.documentElement.style.setProperty("--ovgrid", `repeat(${cols}, ${Math.round(960 * k)}px)`);
}
function toggleOverview() {
  document.documentElement.classList.toggle("overview");
  fit();
  fitOverview(); updateMinimap();
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
document.body.append(minimap);

function updateMinimap() {
  if (!document.documentElement.classList.contains("overview")) return;
  const html = document.documentElement;
  const total = Math.max(1, html.scrollHeight), view = html.clientHeight;
  const top = Math.min(Math.max(0, scrollY || html.scrollTop), Math.max(0, total - view));
  band.style.top = (top / total) * 100 + "%";
  band.style.height = (Math.min(view, total) / total) * 100 + "%";
  ticks.forEach((b, j) => b.classList.toggle("is-current", j === cur));
}
addEventListener("scroll", updateMinimap, { passive: true });
addEventListener("resize", () => { fitOverview(); updateMinimap(); });

fit();
show((parseInt(location.hash.slice(1)) || 1) - 1);

window.SlideDeck = {
  show, toggleOverview,
  get current() { return cur; },
  get slides() { return [...slides]; }
};
})();
