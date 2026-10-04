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
