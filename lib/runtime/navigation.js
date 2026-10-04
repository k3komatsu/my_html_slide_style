function indexFromHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return 0; }
  if (/^\d+$/.test(id)) return Number(id) - 1;
  const slide = document.getElementById(id)?.closest('.slide');
  return slide ? slides.indexOf(slide) : 0;
}

function show(i) {
  if (!Number.isInteger(i)) throw new TypeError('Slide index must be an integer');
  const previous = cur;
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
  if (cur !== previous) emit('slidechange', { index: cur, slide: slides[cur], previous });
}
function fit() {
  keyBindings.hidden = !!document.fullscreenElement || document.documentElement.classList.contains("overview");
  const bottom = keyBindings.hidden ? 0 : keyBindings.getBoundingClientRect().height;
  const k = Math.min(innerWidth / geometry.width, Math.max(0, innerHeight - bottom) / geometry.height);
  document.documentElement.style.setProperty("--deck-bottom", bottom + "px");
  document.documentElement.style.setProperty("--k", k);
  updateLaser();
  updateFocusNotice();
}
addEventListener("resize", fit);
addEventListener("hashchange", () => show(indexFromHash()));
addEventListener("keydown", e => {
  const k = e.key;
  if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
  if (features.menu && (k === "m" || k === "M") && !e.ctrlKey && !e.altKey && !e.metaKey && !e.target.closest?.("input, select, textarea, [contenteditable]:not([contenteditable='false'])")) {
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
  if (overview) { toggleOverview(); show(j); return; }
  const { left, width } = s.getBoundingClientRect();
  show(cur + (e.clientX - left < width * 0.05 ? -1 : 1));   // 左端5%は戻る。拡大縮小後の表示幅で判定する
}));
