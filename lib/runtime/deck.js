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
