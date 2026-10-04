/* 発表固有の処理。popover.jsより先に入力のイベントと初期値を設定する。 */
(() => {
  const demo = document.querySelector(".sample-demo");
  if (!demo) return;
  const scale = demo.querySelector(".demo-scale"), color = demo.querySelector(".demo-color");
  const value = demo.querySelector(".demo-value"), bar = demo.querySelector(".demo-bar");
  const length = demo.querySelector(".demo-length");
  function update() {
    value.textContent = scale.value;
    length.textContent = Number(scale.value) * 150;
    bar.setAttribute("width", length.textContent);
    bar.setAttribute("fill", color.value);
  }
  scale.addEventListener("input", update);
  color.addEventListener("input", update);
  demo.querySelector(".demo-reset").addEventListener("click", () => {
    scale.value = "3"; color.value = "#185ab3";
    scale.dispatchEvent(new Event("input"));
    color.dispatchEvent(new Event("input"));
  });
  update();
})();
