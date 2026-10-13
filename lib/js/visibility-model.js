/* Browser and Node share the settings contract without external packages. */
(() => {
  const fail = message => { throw new Error(message); };
  function normalize(value = { version: 1, modes: [], hidden: {}, defaultMode: '' }) {
    if (!value || value.version !== 1 || !Array.isArray(value.modes)
        || !value.hidden || typeof value.hidden !== 'object' || Array.isArray(value.hidden)) fail('表示設定の形式が不正です');
    const tokens = new Map();
    const modes = value.modes.map(mode => {
      if (!mode || typeof mode.id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(mode.id)
          || typeof mode.name !== 'string' || !mode.name.trim() || mode.name.trim().length > 60) fail('表示モードのID・名前が不正です');
      const name = mode.name.trim();
      for (const token of new Set([mode.id, name])) {
        if (['all', '全表示'].includes(token) || tokens.has(token)) fail('表示モードのID・名前が重複するか予約語です');
        tokens.set(token, mode.id);
      }
      return { id: mode.id, name };
    });
    const ids = new Set(modes.map(mode => mode.id));
    const hidden = Object.assign(Object.create(null), Object.fromEntries(Object.entries(value.hidden).map(([slide, list]) => {
      if (!slide || !Array.isArray(list) || list.some(id => !ids.has(id))) fail('スライドの非表示条件が不正です');
      return [slide, [...new Set(list)]];
    }).filter(([, list]) => list.length)));
    const defaultMode = value.defaultMode ?? '';
    if (typeof defaultMode !== 'string' || (defaultMode && !ids.has(defaultMode))) fail('初期表示モードが不正です');
    return { version: 1, modes, hidden, defaultMode };
  }
  function resolveMode(settings, selector = '') {
    if (['', 'all', '全表示'].includes(selector)) return '';
    return settings.modes.find(mode => mode.id === selector || mode.name === selector)?.id
      ?? fail(`表示モードが見つかりません: ${selector}`);
  }
  const visible = (settings, slide, mode) => !mode || !settings.hidden[slide]?.includes(mode);
  globalThis.SlideVisibilityModel = Object.freeze({ normalize, resolveMode, visible });
})();
