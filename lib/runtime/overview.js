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
  ticks.forEach((b, j) => b.classList.toggle("is-current", j === cur));
}
addEventListener("scroll", updateMinimap, { passive: true });
addEventListener("resize", () => { fitOverview(); updateMinimap(); });
