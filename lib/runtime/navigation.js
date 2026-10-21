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
