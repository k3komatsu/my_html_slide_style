const slides = [...document.querySelectorAll(".slide")];
if (!slides.length) return;
let cur = 0;
const events = new EventTarget();
const emit = (name, detail) => events.dispatchEvent(new CustomEvent(name, { detail }));
function on(name, listener) {
  const handler = event => listener(event.detail);
  events.addEventListener(name, handler);
  return () => events.removeEventListener(name, handler);
}
const features = { overview: true, menu: true, laser: true, ...window.SlideConfig?.features };
if (!features.menu) document.documentElement.classList.add('without-menu');
const geometryStyle = getComputedStyle(document.documentElement);
const geometry = Object.freeze({
  width: parseFloat(geometryStyle.getPropertyValue('--slide-width')),
  height: parseFloat(geometryStyle.getPropertyValue('--slide-height')),
});
if (!(geometry.width > 0 && geometry.height > 0)) throw new Error('Invalid slide geometry');
