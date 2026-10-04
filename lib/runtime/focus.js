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
  focusNotice.hidden = document.documentElement.classList.contains("overview") || (pageFocused && !controls);
  focusMessage.textContent = !pageFocused ? "スライドにフォーカスがありません" : "入力・操作中のためページ送り停止";
  const rect = slides[cur].getBoundingClientRect(), scale = rect.width / geometry.width;
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
