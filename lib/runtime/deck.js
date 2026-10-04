fit();
show(indexFromHash());

window.SlideDeck = {
  show, toggleOverview, on,
  geometry,
  get current() { return cur; },
  get slides() { return [...slides]; }
};
addEventListener('beforeprint', () => emit('beforeprint', {}));
