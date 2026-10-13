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
}
function setVisibilitySettings(value) {
  if (visibilityFixed) throw new Error('このHTMLは指定モードで書き出されています');
  const next = visibilityModel.normalize(value);
  if (!slides.some(slide => visibilityModel.visible(next, slide.dataset.slideId || slide.id, next.defaultMode))) {
    throw new Error('このモードには表示するスライドがありません。少なくとも1枚は表示してください。');
  }
  visibilitySettings = next;
  window.simPopover?.close();
  markVisibility(); updatePagination(true); updateModeSelectors();
  show(cur); updateMinimap(); saveVisibility();
  emit('visibilitychange', { mode: visibilitySettings.defaultMode, slides: slides.filter(isVisible) });
}
function setVisibilityMode(mode) {
  setVisibilitySettings({ ...visibilitySettings, defaultMode: visibilityModel.resolveMode(visibilitySettings, mode) });
}
function editVisibility(change, render = true) {
  try {
    const next = visibilityModel.normalize(visibilitySettings);
    change(next); setVisibilitySettings(next);
    if (render) renderVisibilityEditor();
    return true;
  } catch (error) {
    updateModeSelectors();
    if (visibilityDialog) visibilityDialog.querySelector('.visibility-status').textContent = error.message;
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
    const row = body.insertRow(), id = slide.dataset.slideId || slide.id;
    const title = slide.querySelector('h1, h2')?.textContent.trim() || '無題';
    const cell = document.createElement('th'); cell.scope = 'row'; cell.textContent = `${index + 1}　${title}`; row.append(cell);
    for (const mode of visibilitySettings.modes) {
      const check = document.createElement('input'); check.type = 'checkbox'; check.className = 'visibility-hide';
      check.dataset.slideId = id; check.dataset.modeId = mode.id;
      check.checked = visibilitySettings.hidden[id]?.includes(mode.id) ?? false;
      check.setAttribute('aria-label', `${index + 1} ${title}を${mode.name}モードで非表示`);
      check.addEventListener('change', () => {
        const checked = check.checked;
        if (!editVisibility(next => {
          const list = new Set(next.hidden[id] || []);
          if (checked) list.add(mode.id); else list.delete(mode.id);
          next.hidden[id] = [...list];
        }, false)) check.checked = !checked;
      });
      row.insertCell().append(check);
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
